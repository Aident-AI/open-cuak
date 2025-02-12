import LoginPage from '~src/app/login/page';

export default function PluginOauthPage() {
  return <LoginPage params={{ oauth: 'true' }} />;
}
