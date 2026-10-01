"use client";
import { ChangeEventHandler, CSSProperties, useId, useState } from "react";
import { Ionicons } from "../../types/ionicos";

export interface AppInputProps {
    name?: string
    type?: string;
    onChange?: ChangeEventHandler<HTMLInputElement>
    placeholder?: string;
    value?: string;
    label?: string;
    icon?: Ionicons
    openPassword?: boolean;
    error?: string
    /** Mostra o erro mesmo sem a pessoa ter saído do campo (ex.: ao tentar salvar) */
    mostrarErro?: boolean
    autoComplete?: string
    maxLength?: number
    style?: CSSProperties;
    className?: string
}

/**
 * Campo de texto acessível:
 *  - o rótulo é um <label> ligado ao campo (o leitor de tela diz o nome do campo)
 *  - o erro fica ligado ao campo (aria-invalid + aria-describedby)
 *  - alvo de 48px, texto de 16px (evita o zoom automático do iPhone) e foco visível
 */
export default function AppInput ({type="text", name, onChange, placeholder, value, label, icon, openPassword = false, error, mostrarErro = false, autoComplete, maxLength, style = {}, className = ''}: AppInputProps ) {
    // -------------------------------------------------------------------------
    const id = useId();
    const idErro = `${id}-erro`;
    const [ showPassword, setShowPassword ] = useState(false);
    const [ touched, setTouched ] = useState(false);
    const exibirErro = (touched || mostrarErro) && !!error;
    // -------------------------------------------------------------------------
    return (
        <div className={className} style={style}>
            {label && <label htmlFor={id} className="block ff-default text-[16px] ml-3">{label}</label>}
            <div className="rounded-xl border-2 border-gray-500 px-2 flex items-center bg-[#f5f5f5] my-1 min-h-[48px] focus-within:border-(--primary-color) focus-within:ring-2 focus-within:ring-(--primary-color)">
                {icon && <i className={`ion-${icon} mx-2 text-gray-700`} aria-hidden="true" />}
                <input id={id} type={openPassword ? showPassword ? "text" : "password" : type} name={name} placeholder={placeholder}
                    value={value} onChange={onChange} onBlur={() => setTouched(true)}
                    autoComplete={autoComplete} maxLength={maxLength}
                    // Sem rótulo visível (ex.: login antigo), o placeholder vira o nome acessível
                    aria-label={label ? undefined : placeholder}
                    aria-invalid={exibirErro || undefined} aria-describedby={exibirErro ? idErro : undefined}
                    className="flex-1 min-w-0 bg-transparent py-2 ff-default text-[16px] outline-none" />
                {openPassword &&
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Esconder senha" : "Mostrar senha"} aria-pressed={showPassword}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 cursor-pointer">
                        <i className={showPassword ? "ion-eye" : "ion-eye-disabled"} aria-hidden="true" />
                    </button>}
            </div>
            {exibirErro && <p id={idErro} aria-live="polite" className="text-[#B91C1C] ff-default text-[16px] ml-3">{error}</p>}
        </div>
    )
}
