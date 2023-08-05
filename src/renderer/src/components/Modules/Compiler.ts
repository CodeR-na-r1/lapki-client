import { Elements } from "@renderer/types/diagram";
import Websocket from "isomorphic-ws";
import { CompilerSettings, CompilerResult } from "@renderer/types/CompilerTypes";
import { Dispatch, SetStateAction } from "react";

export class Compiler {
    static port = 8081;
    static host = "localhost";
    static base_address = `ws://${this.host}:${this.port}/`;
    // key: Route, value: Websocket
    static connection: Websocket | undefined;
    static setCompilerData: Dispatch<SetStateAction<CompilerResult | string | undefined>>;
    static setCompilerStatus: Dispatch<SetStateAction<string>>;
    
    static bindReact(setCompilerData: Dispatch<SetStateAction<CompilerResult | string | undefined>>, 
                     setCompilerStatus: Dispatch<SetStateAction<string>>): void {
      this.setCompilerData = setCompilerData;
      this.setCompilerStatus = setCompilerStatus;
    }

    static checkConnection(): boolean {
        return this.connection === undefined
    }

    static async connect(route: string): Promise<Websocket> {
        if(!this.checkConnection()) return this.connection!;
        const ws = new Websocket(route);
        this.setCompilerStatus("Идет подключение...")
        ws.onopen = () => {
          this.setCompilerStatus("Подключен")
          this.connection = ws;
          return ws
        }

        ws.onmessage = (msg: CompilerResult | string) => {
            console.log(msg["data"]);
            this.setCompilerData(JSON.parse(msg["data"]));
        }

        ws.onclose = () => {
            console.log("closed");
            this.setCompilerStatus("Не подключен")
            // TODO: Реконект, в случае очередной неудачи - реконект с интервалов
            this.connection = undefined
            // this.setCompilerData("Не подключен")
        }

        return ws
    }

    static async compile(platform: string, data: Elements){
      const route = `${this.base_address}main`  
      const ws: Websocket = await this.connect(route);
      const compilerSettings: CompilerSettings = {compiler: "arduino-cli", filename: "biba", flags: ["-b", "avr:arduino:uno"] }; 
      const obj = {   
              ...data, 
              compilerSettings: compilerSettings
            }
            
      ws.send(platform);
      ws.send(JSON.stringify(obj));
      this.setCompilerStatus("Идет компиляция...");
    }
} 
