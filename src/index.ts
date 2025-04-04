const { Elm } = require("./Main.elm");
import { ElmApp } from "./ports";
import {
  Address,
  lamports,
  address,
  assertIsAddress,
  createSignerFromKeyPair,
  KeyPairSigner,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  AccountRole,
  IInstruction,
  createTransactionMessage,
  createSolanaRpc,
  createPrivateKeyFromBytes,
  pipe,
} from "@solana/kit";

import { install } from "@solana/webcrypto-ed25519-polyfill";

generateWallet().catch((e) => {
  if (e.name === "NotSupportedError") {
    console.warn("Installing Ed25519 polyfill");
    install();
  } else {
    console.error(e);
  }
});

const rpc = createSolanaRpc("https://api.devnet.solana.com");

// eslint-disable-next-line fp/no-let
let keypair: KeyPairSigner<string> | null = null;

(async () => {
  const app: ElmApp = Elm.Main.init({
    node: document.getElementById("app"),
    flags: {},
  });

  app.ports.generateKey.subscribe(async () => {
    // NOTE: kit.generateKeyPair is not extractable
    // const newKeys = await generateKeyPair();
    const newKeys = await generateWallet();
    const signer = await createSignerFromKeyPair(newKeys);
    keypair = signer;

    app.ports.pubkeyCb.send({
      addr: signer.address,
      exportable: true,
    });

    app.ports.balanceCb.send(0);
  });

  app.ports.fileOut.subscribe(async (val: File) =>
    (async () => {
      const kp = await readKeyfile(val);

      const pair = await parseKeypair(kp);

      keypair = pair;

      app.ports.pubkeyCb.send({
        addr: pair.address,
        exportable: false,
      });

      app.ports.balanceCb.send(
        Number((await rpc.getBalance(pair.address).send()).value)
      );
    })().catch(console.error)
  );

  app.ports.exportKeys.subscribe(() =>
    (async () => {
      if (!keypair) {
        return;
      }

      const [exportedPublicKey, exportedPrivateKey] = await Promise.all([
        window.crypto.subtle.exportKey("raw", keypair.keyPair.publicKey),
        window.crypto.subtle.exportKey("pkcs8", keypair.keyPair.privateKey),
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
      const amount = 0.5;
      const res = await rpc
        .requestAirdrop(keypair.address, lamports(BigInt(amount * 1000000000)))
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

      app.ports.balanceCb.send(
        Number((await rpc.getBalance(keypair.address).send()).value)
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

async function parseKeypair(
  solanaKeypair: Uint8Array
): Promise<KeyPairSigner<string>> {
  const privateKeyBytes = solanaKeypair.slice(0, 32);
  const publicKeyBytes = solanaKeypair.slice(32);

  const [privateKey, publicKey] = await Promise.all([
    createPrivateKeyFromBytes(privateKeyBytes),

    crypto.subtle.importKey("raw", publicKeyBytes, "Ed25519", true, ["verify"]),
  ]);

  return createSignerFromKeyPair({ privateKey, publicKey });
}

const transferSOL = async (
  keypair: KeyPairSigner<string>,
  amount: number,
  recipient: Address,
  simulate: boolean
) => {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigInt64(4, BigInt(amount), true);

  const ix: IInstruction = {
    programAddress: address("11111111111111111111111111111111"),
    accounts: [
      {
        address: keypair.address,
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

  const txMsg = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => appendTransactionMessageInstruction(ix, tx),
    (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(bh.value, tx)
  );

  const signedTx = await signTransactionMessageWithSigners(txMsg);
  const encodedTx = getBase64EncodedWireTransaction(signedTx);

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

function generateWallet(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
}
