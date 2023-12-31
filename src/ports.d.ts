/* This file was generated by github.com/ronanyeah/elm-port-gen */

interface ElmApp {
  ports: Ports;
}

interface Ports {
  log: PortOut<string>;
  fileOut: PortOut<any>;
  sendTx: PortOut<{
    recipient: string;
    amount: number;
    simulate: boolean;
  }>;
  generateKey: PortOut<null>;
  refreshBalance: PortOut<null>;
  logout: PortOut<null>;
  exportKeys: PortOut<null>;
  airdrop: PortOut<null>;
  pubkeyCb: PortIn<{
    addr: string;
    exportable: boolean;
  }>;
  balanceCb: PortIn<number>;
  keysCb: PortIn<any>;
}

interface PortOut<T> {
  subscribe: (_: (_: T) => void) => void;
}

interface PortIn<T> {
  send: (_: T) => void;
}

export { ElmApp };
