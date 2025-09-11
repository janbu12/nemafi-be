declare module 'routeros-client' {
  // Mendefinisikan interface untuk objek yang dikembalikan oleh .menu()
  interface RosMenu {
    add(options: Record<string, any>): Promise<any>;
    getAll(options?: Record<string, any>): Promise<any[]>;
    set(id: string, options: Record<string, any>): Promise<any>;
    disable(id: string): Promise<any>;
    enable(id: string): Promise<any>;
  }

  // Mendefinisikan ulang class RouterOSClient untuk menambahkan method .menu()
  export class RouterOSClient {
    constructor(options: {
      host: string;
      user: string;
      password?: string;
      port?: number;
      timeout?: number;
      secure?: boolean;
    });

    connect(): Promise<void>;
    close(): Promise<void>;
    
    // Memberitahu TypeScript bahwa method .menu() ada dan mengembalikan tipe RosMenu
    menu(path: string): RosMenu;
  }
}