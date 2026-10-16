import QRCode from 'qrcode';
// 仅在已认证的本人服务券接口输出，禁止公开缓存；门店端扫码后调用已认证的核销接口。
export const renderQR = token => QRCode.toDataURL(token,{width:240,margin:2,errorCorrectionLevel:'M'});
