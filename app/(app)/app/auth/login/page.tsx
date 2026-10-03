import { Metadata } from "next"
import { LoginPage } from "./LoginPage"

export const metadata: Metadata = {
    title: 'Log in — Goheza',
    description: 'Log in to your Goheza account to manage campaigns or track your creator earnings.',
}

export default function Page(){
    return (
        <>
            <LoginPage/>
        </>
    )
}