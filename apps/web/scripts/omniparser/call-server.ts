import { execScript } from '~scripts/base';
import { ALogger } from '~shared/logging/ALogger';
import { OmniParserService } from '~shared/services/OmniParserService';

execScript(async (): Promise<void> => {
  const imgUrl =
    'https://remote-browser-sessions.s3.us-west-1.amazonaws.com/users/00af4bc1-0a0d-4a28-85d2-984d2c4b1434/sessions/9e9c314f-348c-4918-adfe-1663a0567bef/1737514662679.jpg?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBQaCXVzLXdlc3QtMSJIMEYCIQCHZgoLgkW9XsumzUiRVRlb%2FcCFJOhCszo1S1xQrDkwkgIhAPuORX5q3w4I8iCiMqRpeK4m%2BrWc9srSimS4%2BLfkM%2FuhKssDCD0QARoMOTc1NDU0NDc2MTU3IgzZrTeRVWZao5phGRsqqAOeaQe2unQDUS9Thek5f%2FocigBCZAHweE08UegfVKaJcINxzPA3qGniAUkzSExoEKvq%2BlAvfXy%2BoXtxcUSIvuFJkIQ8JINQLBz1Hi3vnwVXg92%2FYtY1rcvZ5Vqm%2F0LqA31aByWPS9LJ9rZN3NbIKyxp7Q1cqWK3Z4iKc78fTV%2FnjEKzGH1%2BnHRm4HOjQoDrYnUs9QOz8qR%2FtFpWryrhCr6yi91fMG1anmh1yxDPni16MjJgHIZhZXpLeHstzZh5QSQLI1XIbYZ12Hf55Yv0ReOes51QAFxwyRgeFF2jOE%2F1M7%2F5BFXULnxx7ckAVCnjtqsN%2BN0UNxuGq3jQhexdU0sXi5CnvnJ518SYhJ4dsle245ZvVDUfkgCEtxMy9ut4gGgpi7aIEAzqjSIPR2%2FSgxnUzzDZhyI3%2Bo7fCSvkgjjaKQ%2BxHL1XpSgz82h20yE6WOGfTyj92fqqll7Nu4u6lHnP1kR82Anqi5BDeeOS66PvSx%2BCs07Cx151XoS4e1Anen97PPO6Pa9eC7SeR3uleGDM6RgoUrmjhEXVQfiJ%2FbV0AdOm%2BFMkfj3kMOSqwL0GOuMC5o%2BLCw%2BIx5AyvhKib7F4zCLNOzi8wCVlvmeWeyn1%2BA3F72m5TZjjsfVtZlQEFsBkIw19fRH6gl9cz%2BZjyLV3h%2F9gR3giM5hzMiw%2FM301ZhqU91j5duV6OCxd%2B%2BttxJ3FymXc3p1QLeeWmZuBHmCZykVIwe2OlaoUXkU%2FnAYQEIigIVUDmi3XI7xB39bvfoVHeXlM2ssIfPyvn0kvMhvU32kGN%2B8M%2Fi2k4aht3Dj0ZheOwnDexFP7KV52wY2J4hqKSQAVUweK6HrFDS3ffDc4W3zTZ9BHRukkI5j2SYwk6q4ImilFG6KiLTZThlYAF1Gr5l0ppF%2BBmbK7HJPSRvM4ErV2fLRSvrBnOMQif265m%2ByYyocdTMsS9Lool7GioMLDHjwHfwCakL1eHWAPpUjQZw5tLM1ORka5aaaykpvXIiQYa2scroQ7%2BAmmkNW1ccUpY4TYOhr%2BW8kg5V0sAFANuQ6zMA%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIA6GHM6C56ZSVCDSR4%2F20250215%2Fus-west-1%2Fs3%2Faws4_request&X-Amz-Date=20250215T041823Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=e56786718c4e44644d5cb4573016f6ca4bb311cb9a10d32cfe84ccb11f99f8ee';

  const serviceUp = await OmniParserService.genPing();
  if (!serviceUp) throw new Error('Omniparser is down');
  ALogger.info('Omniparser is up');

  const imgResponse = await fetch(imgUrl);
  if (!imgResponse.ok) throw new Error('Failed to fetch image');
  const imgBuffer = await imgResponse.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString('base64');
  ALogger.info('Image fetched and converted to base64');

  const rsp = await OmniParserService.genParseImage(base64);
  ALogger.info({
    context: 'received response',
    rsp: { ...rsp, base64: `${rsp.base64.substring(0, 30)}[skipped]`, base64Length: rsp.base64.length },
  });
});
