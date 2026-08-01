import Image from 'next/image'

interface AvatarX {
    brandLogo?: string | null
    initial: string
    name: string
}

export function AvatarX({ brandLogo, initial, name }: AvatarX) {
    if (brandLogo) {
        return (
            <Image
                src={brandLogo}
                alt={`${name} logo`}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover"
            />
        )
    }

    return (
        <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundImage: 'var(--gradient-primary)' }}
        >
            {initial}
        </span>
    )
}
