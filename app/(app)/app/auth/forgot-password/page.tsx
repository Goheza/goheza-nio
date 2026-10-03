import { Metadata } from "next"
import ForgotPasswordPage from "./forgotPage"


export const metadata: Metadata = {
    title: 'Forgot Pasword — Goheza',
}

export default function Page(){
    return (
        <>
            <ForgotPasswordPage/>
        </>
    )
}