'use client'
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

type AppProps = {
    children: React.ReactNode,
    message: string,
}

export default function Hello({ children, message, ...props }: AppProps) {
    const { t } = useTranslation()
    function submit() {
        toast.warning("This is for test only, not implemented.")
    }
    return <div className="w-full min-h-screen flex flex-col justify-center items-center bg-gradient-to-r from-rose-100 to-teal-100" {...props}>
    <Card className="mx-auto max-w-sm">
        <CardHeader>
            <CardTitle className="text-xl">{t('sign_up')}</CardTitle>
            <CardDescription>
                {t('sign_up_desc')}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="first-name">{t('first_name')}</Label>
                        <Input id="first-name" placeholder="Max" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="last-name">{t('last_name')}</Label>
                        <Input id="last-name" placeholder="Robinson" required />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="me@example.com"
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">{t('password')}</Label>
                    <Input id="password" type="password" />
                </div>
                <Button type="submit" className="w-full" onClick={submit}>
                    {t('create_account')}
                </Button>
                <Button variant="outline" className="w-full" onClick={submit}>
                    {t('sign_up_with_gitHub')}
                </Button>
            </div>
            <div className="mt-4 text-center text-sm">
                {t('already_have_account')}{" "}
                <a href="#" className="underline">
                    {t('sign_in')}
                </a>
            </div>
        </CardContent>
    </Card>
    </div>
}