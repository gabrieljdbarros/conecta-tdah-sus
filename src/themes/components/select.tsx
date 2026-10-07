"use client";
import { ChangeEventHandler, CSSProperties, ReactNode, useId, useState } from "react";

export interface AppSelectProps {
    name?: string
    children: ReactNode;
    onChange?: ChangeEventHandler<HTMLSelectElement>
    value?: string;
    label?: string;
    error?: string
    /** Mostra o erro mesmo sem a pessoa ter saído do campo (ex.: ao tentar salvar) */
    mostrarErro?: boolean
    style?: CSSProperties;
    className?: string
}

/**
 * Lista de opções acessível: rótulo ligado ao campo, erro ligado ao campo,
 * alvo de 48px, texto de 16px e foco visível (mesmo padrão do AppInput)
 */
export default function AppSelect ({children, name, onChange, value, label, error, mostrarErro = false, style = {}, className = ''}: AppSelectProps ) {
    // -------------------------------------------------------------------------
    const id = useId();
    const idErro = `${id}-erro`;
    const [ touched, setTouched ] = useState(false);
    const exibirErro = (touched || mostrarErro) && !!error;
    // -------------------------------------------------------------------------
    return (
        <div className={className} style={style}>
            {label && <label htmlFor={id} className="block ff-default text-[16px] ml-3">{label}</label>}
            <div className="rounded-xl border-2 border-gray-500 px-2 flex bg-[#f5f5f5] my-1 min-h-[48px] focus-within:border-(--cor-link) focus-within:ring-2 focus-within:ring-(--cor-link)">
                <select id={id} className="w-full bg-transparent py-2 ff-default text-[16px] outline-none cursor-pointer"
                    onChange={onChange} onBlur={() => setTouched(true)} name={name} value={value}
                    aria-invalid={exibirErro || undefined} aria-describedby={exibirErro ? idErro : undefined}>
                    {children}
                </select>
            </div>
            {exibirErro && <p id={idErro} aria-live="polite" className="text-[#B91C1C] ff-default text-[16px] ml-3">{error}</p>}
        </div>
    )
}
