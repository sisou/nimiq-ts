const NimiqJS = require("@nimiq/core");
const NimiqTS = require("..");

async function main() {
    const entropy = NimiqJS.Entropy.generate();

    const privKeyJS = NimiqJS.PrivateKey.unserialize(entropy.serialize());
    const privKeyTS = NimiqTS.PrivateKey.unserialize(entropy.serialize());

    console.assert(privKeyJS.toHex() === privKeyTS.toHex(), "Private Keys are not equal");
    // console.log(privKeyJS.toHex());
    // console.log(privKeyTS.toHex());

    const pubKeyJS = NimiqJS.PublicKey.derive(privKeyJS);
    const pubKeyTS = await NimiqTS.PublicKey.derive(privKeyTS);

    console.assert(pubKeyJS.toHex() === pubKeyTS.toHex(), "Public Keys are not equal");
    // console.log(pubKeyJS.toHex());
    // console.log(pubKeyTS.toHex());

    const addressJS = pubKeyJS.toAddress().toUserFriendlyAddress();
    const addressTS = pubKeyTS.toAddress().toUserFriendlyAddress();

    console.assert(addressJS === addressTS, "Addresses are not equal");
    // console.log(addressJS);
    // console.log(addressTS);

    console.info("Passed!");
}
main();
