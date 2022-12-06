type Config = {
	NETWORK_ID: number,
	NETWORK_NAME: string,
}

export class GenesisConfig {
	static CONFIGS: Record<string, Config> = {
		// 'main': {
		// 	NETWORK_ID: 42,
		// 	NETWORK_NAME: 'main'
		// },

		'test': {
			NETWORK_ID: 5,
			NETWORK_NAME: 'test'
		},

		'dev': {
			NETWORK_ID: 6,
			NETWORK_NAME: 'dev'
		},

		'unit': {
			NETWORK_ID: 7,
			NETWORK_NAME: 'unit'
		},
	}

	static _config?: Config;

    // static main() {
    //     GenesisConfig.init(GenesisConfig.CONFIGS['main']);
    // }

    static test() {
        GenesisConfig.init(GenesisConfig.CONFIGS['test']);
    }

    static dev() {
        GenesisConfig.init(GenesisConfig.CONFIGS['dev']);
    }

    static unit() {
        GenesisConfig.init(GenesisConfig.CONFIGS['unit']);
    }

    static init(config: Config) {
        if (GenesisConfig._config) throw new Error('GenesisConfig already initialized');
        if (!config.NETWORK_ID) throw new Error('Config is missing network id');
        if (!config.NETWORK_NAME) throw new Error('Config is missing network name');

        GenesisConfig._config = config;
    }

    static get NETWORK_ID(): number {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.NETWORK_ID;
    }

    static get NETWORK_NAME(): string {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.NETWORK_NAME;
    }

    static networkIdToNetworkName(networkId: number): string {
        for (const key of Object.keys(GenesisConfig.CONFIGS)) {
            const config = GenesisConfig.CONFIGS[key];
            if (networkId === config.NETWORK_ID) {
                return config.NETWORK_NAME;
            }
        }
        throw new Error(`Unable to find networkName for networkId ${networkId}`);
    }

    static networkIdFromAny(networkId: number | string): number {
        if (typeof networkId === 'number') return networkId;
        if (GenesisConfig.CONFIGS[networkId]) {
            return GenesisConfig.CONFIGS[networkId].NETWORK_ID;
        }
        throw new Error(`Unable to find networkId for ${networkId}`);
    }
}
