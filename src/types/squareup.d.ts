declare module "squareup" {
  export enum Environment {
    Production = "production",
    Sandbox = "sandbox",
  }

  export interface ClientOptions {
    accessToken: string;
    environment?: Environment;
  }

  export class Client {
    constructor(options: ClientOptions);
    invoicesApi: unknown;
    paymentsApi: unknown;
    customersApi: unknown;
    ordersApi: unknown;
    catalogApi: unknown;
    locationsApi: unknown;
  }
}
