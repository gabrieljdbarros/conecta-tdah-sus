import { Metadata } from "next";
import MolduraEntrada from "../_entrada/moldura";
import NovaSenhaForm from "./_form";

// ===============================================
export const metadata: Metadata = {
  title: 'Criar nova senha',
};
// ===============================================
export default function Page() {

    return (
        <MolduraEntrada>
            <NovaSenhaForm/>
        </MolduraEntrada>
    );

}
