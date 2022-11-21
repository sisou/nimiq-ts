const NimiqJS = require("@nimiq/core");
const NimiqTS = require("..");

async function main() {
    const entropy = NimiqJS.Entropy.generate();

    const privKeyJS = NimiqJS.PrivateKey.unserialize(entropy.serialize());
    const privKeyTS = NimiqTS.PrivateKey.unserialize(entropy.serialize());

    NimiqJS.Assert.that(privKeyJS.toHex() === privKeyTS.toHex(), "Private Keys are not equal");
    // console.log(privKeyJS.toHex());
    // console.log(privKeyTS.toHex());

    await NimiqTS.initialize();

    const pubKeyJS = NimiqJS.PublicKey.derive(privKeyJS);
    const pubKeyTS = NimiqTS.PublicKey.derive(privKeyTS);

    NimiqJS.Assert.that(pubKeyJS.toHex() === pubKeyTS.toHex(), "Public Keys are not equal");
    // console.log(pubKeyJS.toHex());
    // console.log(pubKeyTS.toHex());

    const addressJS = pubKeyJS.toAddress().toUserFriendlyAddress();
    const addressTS = pubKeyTS.toAddress().toUserFriendlyAddress();

    NimiqJS.Assert.that(addressJS === addressTS, "Addresses are not equal");
    // console.log(addressJS);
    // console.log(addressTS);

    NimiqJS.GenesisConfig.dev();
    NimiqTS.GenesisConfig.dev();

    const transactionJS = new NimiqJS.BasicTransaction(
        pubKeyJS,
        NimiqJS.Address.fromAny('0000000000000000000000000000000000000000'),
        1e5, 0, 0,
    );
    const transactionTS = new NimiqTS.BasicTransaction(
        pubKeyTS,
        NimiqTS.Address.fromAny('0000000000000000000000000000000000000000'),
        1e5, 0, 0,
    );
    transactionJS.signature = NimiqJS.Signature.create(privKeyJS, pubKeyJS, transactionJS.serializeContent());
    transactionTS.signature = NimiqTS.Signature.create(privKeyTS, pubKeyTS, transactionTS.serializeContent());
    transactionJSHex = NimiqJS.BufferUtils.toHex(transactionJS.serialize());
    transactionTSHex = NimiqTS.BufferUtils.toHex(transactionTS.serialize());

    NimiqJS.Assert.that(transactionJSHex === transactionTSHex, "Transactions are not equal");

    console.info("Passed!");
}
main();
