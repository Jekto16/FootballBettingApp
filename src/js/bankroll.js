const Bankroll = {
    STORAGE_KEY: 'footballBettingApp_bankroll',

    defaultData: {
        initialBankroll: 500,
        currentBankroll: 500,
        totalProfit: 0,
        totalBets: 0,
        wonBets: 0,
        lostBets: 0,
        pushBets: 0
    },

    load() {
        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (!saved) {
            return { ...this.defaultData };
        }

        try {
            return {
                ...this.defaultData,
                ...JSON.parse(saved)
            };
        } catch (error) {
            console.error('Erro ao carregar a banca:', error);
            return { ...this.defaultData };
        }
    },

    save(data) {
        localStorage.setItem(
            this.STORAGE_KEY,
            JSON.stringify(data)
        );
    },

    setInitialBankroll(amount) {
        const value = Number(amount);

        if (!Number.isFinite(value) || value < 0) {
            throw new Error('Valor de banca inválido.');
        }

        const data = this.load();

        data.initialBankroll = value;
        data.currentBankroll = value;
        data.totalProfit = 0;
        data.totalBets = 0;
        data.wonBets = 0;
        data.lostBets = 0;
        data.pushBets = 0;

        this.save(data);

        return data;
    },

    get() {
        return this.load();
    },

    getROI() {
        const data = this.load();

        if (data.initialBankroll <= 0) {
            return 0;
        }

        return (
            data.totalProfit / data.initialBankroll
        ) * 100;
    }
};

window.Bankroll = Bankroll;