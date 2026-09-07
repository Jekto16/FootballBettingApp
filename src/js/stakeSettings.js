const StakeSettings = {

    STORAGE_KEY: 'footballBettingApp_stakeSettings',

    DEFAULTS: {
        method: 'percentage',
        defaultPercentage: 1,
        maxPercentage: 3,
        maxExposure: 10,
        unitValue: 10
    },

    load() {

        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (!saved) {
            return { ...this.DEFAULTS };
        }

        try {

            const data = JSON.parse(saved);

            return {
                ...this.DEFAULTS,
                ...data
            };

        } catch (error) {

            console.error(
                'Erro ao carregar definições de stake:',
                error
            );

            return { ...this.DEFAULTS };
        }
    },

    save(settings) {

        localStorage.setItem(
            this.STORAGE_KEY,
            JSON.stringify(settings)
        );

        // Verificação
        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (!saved) {
            throw new Error(
                'As definições não foram guardadas no localStorage.'
            );
        }

    },

    get() {
        return this.load();
    },

    update(settings) {

        const current = this.load();

        const updated = {
            ...current,
            ...settings
        };

        this.save(updated);

        console.log(
            'Definições de stake guardadas:',
            updated
        );

        return updated;
    },

    calculateDefaultStake(bankroll) {

        const settings = this.load();

        const value =
            Number(bankroll) *
            (Number(settings.defaultPercentage) / 100);

        return Math.max(0, value);
    },

    calculateMaximumStake(bankroll) {

        const settings = this.load();

        const value =
            Number(bankroll) *
            (Number(settings.maxPercentage) / 100);

        return Math.max(0, value);
    }
};


/* =========================
   INTERFACE
========================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        setupStakeSettings();
        setupStakeMethodListener();
        loadStakeSettings();

    }
);


/* =========================
   BOTÃO GUARDAR
========================== */

function setupStakeSettings() {

    const saveButton =
        document.getElementById(
            'save-stake-settings'
        );

    if (!saveButton) {

        console.error(
            'ERRO: botão save-stake-settings não encontrado.'
        );

        return;
    }

    saveButton.addEventListener(
        'click',
        saveStakeSettings
    );

}


/* =========================
   CARREGAR DEFINIÇÕES
========================== */

function loadStakeSettings() {

    const settings =
        StakeSettings.get();

    console.log(
        'Definições carregadas:',
        settings
    );


    const method =
        document.getElementById(
            'stake-method'
        );

    const defaultPercentage =
        document.getElementById(
            'default-stake-percentage'
        );

    const maxPercentage =
        document.getElementById(
            'max-stake-percentage'
        );

    const maxExposure =
        document.getElementById(
            'max-exposure'
        );

    const unitValue =
        document.getElementById(
            'unit-value'
        );


    if (method) {
        method.value =
            settings.method;
    }

    if (defaultPercentage) {
        defaultPercentage.value =
            settings.defaultPercentage;
    }

    if (maxPercentage) {
        maxPercentage.value =
            settings.maxPercentage;
    }

    if (maxExposure) {
        maxExposure.value =
            settings.maxExposure;
    }

    if (unitValue) {
        unitValue.value =
            settings.unitValue;
    }


    updateStakeMethodVisibility();

}


/* =========================
   GUARDAR DEFINIÇÕES
========================== */

function saveStakeSettings() {

    console.log(
        'Botão "Guardar definições" clicado.'
    );


    const methodElement =
        document.getElementById(
            'stake-method'
        );

    const defaultPercentageElement =
        document.getElementById(
            'default-stake-percentage'
        );

    const maxPercentageElement =
        document.getElementById(
            'max-stake-percentage'
        );

    const maxExposureElement =
        document.getElementById(
            'max-exposure'
        );

    const unitValueElement =
        document.getElementById(
            'unit-value'
        );


    if (
        !methodElement ||
        !defaultPercentageElement ||
        !maxPercentageElement ||
        !maxExposureElement ||
        !unitValueElement
    ) {

        console.error(
            'ERRO: um ou mais campos de stake não foram encontrados.'
        );

        alert(
            'Erro: não foi possível encontrar os campos das definições de stake.'
        );

        return;
    }


    const method =
        methodElement.value;

    const defaultPercentage =
        Number(
            defaultPercentageElement.value
        );

    const maxPercentage =
        Number(
            maxPercentageElement.value
        );

    const maxExposure =
        Number(
            maxExposureElement.value
        );

    const unitValue =
        Number(
            unitValueElement.value
        );


    console.log(
        'Valores a guardar:',
        {
            method,
            defaultPercentage,
            maxPercentage,
            maxExposure,
            unitValue
        }
    );


    /* =========================
       VALIDAÇÕES
    ========================== */

    if (
        !Number.isFinite(defaultPercentage) ||
        defaultPercentage <= 0
    ) {

        alert(
            'A stake padrão deve ser superior a 0%.'
        );

        return;
    }


    if (
        !Number.isFinite(maxPercentage) ||
        maxPercentage <= 0
    ) {

        alert(
            'A stake máxima deve ser superior a 0%.'
        );

        return;
    }


    if (
        maxPercentage < defaultPercentage
    ) {

        alert(
            'A stake máxima não pode ser inferior à stake padrão.'
        );

        return;
    }


    if (
        !Number.isFinite(maxExposure) ||
        maxExposure <= 0 ||
        maxExposure > 100
    ) {

        alert(
            'A exposição máxima deve estar entre 0% e 100%.'
        );

        return;
    }


    if (
        !Number.isFinite(unitValue) ||
        unitValue <= 0
    ) {

        alert(
            'O valor de uma unidade deve ser superior a 0 €.'
        );

        return;
    }


    /* =========================
       GUARDAR
    ========================== */

    try {

        const saved =
            StakeSettings.update({

                method,

                defaultPercentage,

                maxPercentage,

                maxExposure,

                unitValue

            });


        console.log(
            'DEFINIÇÕES GUARDADAS COM SUCESSO:',
            saved
        );


        /* =========================
           CONFIRMAR LEITURA
        ========================== */

        const verification =
            StakeSettings.get();


        console.log(
            'VERIFICAÇÃO APÓS GUARDAR:',
            verification
        );


        const message =
            document.getElementById(
                'stake-settings-message'
            );


        if (message) {

            message.textContent =
                'Definições de stake guardadas com sucesso.';

            message.className =
                'settings-message success';

        }


        updateStakeMethodVisibility();


    } catch (error) {

        console.error(
            'ERRO AO GUARDAR DEFINIÇÕES:',
            error
        );


        alert(
            'Ocorreu um erro ao guardar as definições.'
        );

    }

}


/* =========================
   VISIBILIDADE DAS UNIDADES
========================== */

function updateStakeMethodVisibility() {

    const method =
        document.getElementById(
            'stake-method'
        );

    const unitField =
        document.getElementById(
            'unit-value-field'
        );


    if (!method || !unitField) {
        return;
    }


    if (method.value === 'units') {

        unitField.style.display =
            'block';

    } else {

        unitField.style.display =
            'none';

    }

}


/* =========================
   ALTERAÇÃO DO MÉTODO
========================== */

function setupStakeMethodListener() {

    const method =
        document.getElementById(
            'stake-method'
        );


    if (!method) {
        return;
    }


    method.addEventListener(
        'change',
        updateStakeMethodVisibility
    );

}


window.StakeSettings =
    StakeSettings;