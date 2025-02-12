'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import GmailLogo from '~assets/login/logo_gmail.svg';
import GoogleG from '~assets/login/logo_googleg.svg';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';
import { redirectOauthLogin } from '~src/actions/redirectOauthLogin';

interface Props {
  logo?: 'google' | 'gmail';
  oauth?: boolean;
  targetPath?: string;
  title?: string;
  extraScopes?: string[];
}

// TODO: make this back to be a server component (through migrating to use server actions)
export default function GoogleLoginButton(props: Props) {
  const searchParams = useSearchParams();

  const supabase = SupabaseClientForClient.createForClientComponent();

  async function handleSignInWithGoogle() {
    if (props.oauth && searchParams) {
      await redirectOauthLogin(searchParams);
      return;
    }

    const targetPath = props.targetPath ?? searchParams?.get('target');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: ['email', 'profile', ...(props.extraScopes ?? [])].join(','),
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: location.origin + '/auth/callback?target=' + (targetPath ?? ''),
      },
    });

    if (error) ALogger.error(error);
  }

  const title = props.title ?? 'Continue with Google';
  const logo = props.logo === 'gmail' ? GmailLogo : GoogleG;
  const altText = props.logo === 'gmail' ? 'Gmail Logo' : 'Google Logo';

  return (
    <form className="h-12 w-full max-w-64" action={handleSignInWithGoogle}>
      <button className="flex h-full w-full items-center justify-center rounded border-2" type="submit">
        <Image className="mr-4 w-6" src={logo} alt={altText} />
        <p className="w-7/12 text-xs text-black plus:text-sm">{title}</p>
      </button>
    </form>
  );
}
