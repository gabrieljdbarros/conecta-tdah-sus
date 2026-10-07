import { Metadata } from "next";
import MolduraEntrada from "../_entrada/moldura";
import Entrada from "./_escolha";

// ===============================================
export const metadata: Metadata = {
  title: 'Entrar',
};
// ===============================================
export default function Page() {

    return (
        <MolduraEntrada>
            <Entrada />
        </MolduraEntrada>
    );

}
