import { Metadata } from "next";
import MolduraEntrada from "../_entrada/moldura";
import CadastroForm from "./_form";

// ===============================================
export const metadata: Metadata = {
  title: 'Criar conta',
};
// ===============================================
export default function Page() {

    return (
        <MolduraEntrada>
            <CadastroForm/>
        </MolduraEntrada>
    );

}
