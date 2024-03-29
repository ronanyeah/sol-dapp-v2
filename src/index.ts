/* eslint-disable fp/no-mutation, fp/no-mutating-methods */
const { Elm } = require("./Main.elm");
import { ElmApp } from "./ports";
import { pipe } from "@solana/functional";
import {
  //generateKeyPair,
  lamports,
  address,
  Base58EncodedAddress,
  assertIsAddress,
  getBase64EncodedWireTransaction,
  signTransaction,
  setTransactionFeePayer,
  setTransactionLifetimeUsingBlockhash,
  appendTransactionInstruction,
  AccountRole,
  IInstruction,
  createTransaction,
  getAddressFromPublicKey,
  createDefaultRpcTransport,
  createSolanaRpc,
} from "@solana/web3.js";
import { createPrivateKeyFromBytes } from "@solana/keys";

import "@solana/webcrypto-ed25519-polyfill";

const devnetTransport = createDefaultRpcTransport({
  url: "https://api.devnet.solana.com",
});
const rpc = createSolanaRpc({ transport: devnetTransport });

// eslint-disable-next-line fp/no-let
let keypair: CryptoKeyPair | null = null;

(async () => {
  const app: ElmApp = Elm.Main.init({
    node: document.getElementById("app"),
    flags: {},
  });

  app.ports.generateKey.subscribe(async () => {
    // NOTE: generateKeyPair is not extractable
    // const newKeys = await generateKeyPair();
    const extractable = true;
    const newKeys = (await crypto.subtle.generateKey("Ed25519", extractable, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    keypair = newKeys;

    const addr = await getAddressFromPublicKey(keypair.publicKey);

    app.ports.pubkeyCb.send({
      addr: addr,
      exportable: extractable,
    });

    app.ports.balanceCb.send(0);
  });

  app.ports.fileOut.subscribe(async (val: File) =>
    (async () => {
      const kp = await readKeyfile(val);

      const pair = await parseKeypair(kp);

      keypair = pair;

      const addr = await getAddressFromPublicKey(keypair.publicKey);
      app.ports.pubkeyCb.send({
        addr: addr,
        exportable: false,
      });

      app.ports.balanceCb.send(
        Number((await rpc.getBalance(addr).send()).value)
      );
    })().catch(console.error)
  );

  app.ports.exportKeys.subscribe(() =>
    (async () => {
      if (!keypair) {
        return;
      }

      const [exportedPublicKey, exportedPrivateKey] = await Promise.all([
        window.crypto.subtle.exportKey("raw", keypair.publicKey),
        window.crypto.subtle.exportKey("pkcs8", keypair.privateKey),
      ]);

      const solanaKey = new Uint8Array(64);
      solanaKey.set(new Uint8Array(exportedPrivateKey).slice(16));
      solanaKey.set(new Uint8Array(exportedPublicKey), 32);

      app.ports.keysCb.send(Array.from(solanaKey));
    })().catch(console.error)
  );

  app.ports.logout.subscribe(async () => {
    keypair = null;
  });

  app.ports.airdrop.subscribe(async () =>
    (async () => {
      if (!keypair) {
        return;
      }
      const addr = await getAddressFromPublicKey(keypair.publicKey);
      const amount = 0.5;
      const res = await rpc
        .requestAirdrop(addr, lamports(BigInt(amount * 1000000000)))
        .send();
      console.log(res);
      alert("Airdrop success!");
    })().catch((e) => {
      console.error(e);
      if (e.statusCode === 429) {
        alert("Too many requests!");
      } else {
        alert("Airdrop failure!");
      }
    })
  );

  app.ports.refreshBalance.subscribe(() =>
    (async () => {
      if (!keypair) {
        return;
      }

      const addr = await getAddressFromPublicKey(keypair.publicKey);

      app.ports.balanceCb.send(
        Number((await rpc.getBalance(addr).send()).value)
      );
    })().catch(console.error)
  );

  app.ports.sendTx.subscribe(({ amount, recipient, simulate }) =>
    (async () => {
      if (!keypair) {
        return;
      }
      assertIsAddress(recipient);
      await transferSOL(keypair, amount, recipient, simulate);
    })().catch(console.error)
  );
})().catch(console.error);

async function parseKeypair(solanaKeypair: Uint8Array): Promise<CryptoKeyPair> {
  const privateKeyBytes = solanaKeypair.slice(0, 32);
  const publicKeyBytes = solanaKeypair.slice(32);

  const [privateKey, publicKey] = await Promise.all([
    createPrivateKeyFromBytes(privateKeyBytes),

    crypto.subtle.importKey("raw", publicKeyBytes, "Ed25519", true, ["verify"]),
  ]);

  return { privateKey, publicKey };
}

const transferSOL = async (
  keypair: CryptoKeyPair,
  amount: number,
  recipient: Base58EncodedAddress,
  simulate: boolean
) => {
  const signerPub = await getAddressFromPublicKey(keypair.publicKey);

  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigInt64(4, BigInt(amount), true);

  const ix: IInstruction = {
    programAddress: address("11111111111111111111111111111111"),
    accounts: [
      {
        address: signerPub,
        role: AccountRole.WRITABLE_SIGNER,
      },
      {
        address: recipient,
        role: AccountRole.WRITABLE,
      },
    ],
    data: data,
  };

  const bh = await rpc.getLatestBlockhash().send();

  const encodedTx = await pipe(
    createTransaction({ version: 0 }),
    (tx) => appendTransactionInstruction(ix, tx),
    (tx) => setTransactionFeePayer(signerPub, tx),
    (tx) => setTransactionLifetimeUsingBlockhash(bh.value, tx),
    (tx) => signTransaction([keypair], tx),
    async (tx) => getBase64EncodedWireTransaction(await tx)
  );

  if (simulate) {
    const sx = await rpc
      .simulateTransaction(encodedTx, { encoding: "base64" })
      .send();
    console.log("sim ok:", sx.value.err === null);
    sx.value.err === null
      ? alert("Simulation success!")
      : alert("Simulation failure!");
  } else {
    try {
      const sig = await rpc
        .sendTransaction(encodedTx, { encoding: "base64" })
        .send();
      console.log("tx ok:", sig);
      alert("Transaction success!");
    } catch (e) {
      console.error(e);
      alert("Transaction failure!");
    }
  }
};

async function readKeyfile(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const content = new TextDecoder().decode(arrayBuffer);
  const parsed = JSON.parse(content);

  return new Uint8Array(parsed);
}
