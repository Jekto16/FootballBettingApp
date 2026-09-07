const Bets = {

    STORAGE_KEY: 'footballBettingApp_bets',


    /* =========================
       CARREGAR
    ========================== */

    load() {

        const saved =
            localStorage.getItem(
                this.STORAGE_KEY
            );


        if (!saved) {
            return [];
        }


        try {

            return JSON.parse(saved);

        } catch (error) {

            console.error(
                'Erro ao carregar apostas:',
                error
            );

            return [];

        }

    },


    /* =========================
       GUARDAR
    ========================== */

    save(bets) {

        localStorage.setItem(
            this.STORAGE_KEY,
            JSON.stringify(bets)
        );

    },


    /* =========================
       CALCULAR LUCRO
    ========================== */

    calculateProfit(bet, status) {

        const odds =
            Number(bet.odds);

        const stake =
            Number(bet.stake);


        if (
            !Number.isFinite(odds) ||
            !Number.isFinite(stake)
        ) {

            return 0;

        }


        if (status === 'won') {

            return (
                stake *
                (odds - 1)
            );

        }


        if (status === 'lost') {

            return -stake;

        }


        return 0;

    },


    /* =========================
       ADICIONAR
    ========================== */

    add(bet) {

        const bets =
            this.load();


        const newBet = {

            id:
                crypto.randomUUID(),

            createdAt:
                new Date().toISOString(),

            date:
                bet.date,

            competition:
                bet.competition,

            homeTeam:
                bet.homeTeam,

            awayTeam:
                bet.awayTeam,

            market:
                bet.market,

            selection:
                bet.selection,

            odds:
                Number(bet.odds),

            stake:
                Number(bet.stake),

            status:
                'pending',

            profit:
                0

        };


        bets.unshift(newBet);


        this.save(bets);


        return newBet;

    },


    /* =========================
       ATUALIZAR
    ========================== */

    update(id, changes) {

        const bets =
            this.load();


        const index =
            bets.findIndex(
                bet => bet.id === id
            );


        if (index === -1) {

            throw new Error(
                'Aposta não encontrada.'
            );

        }


        const currentBet =
            bets[index];


        const updatedBet = {

            ...currentBet,

            ...changes,

            odds:
                Number(
                    changes.odds ??
                    currentBet.odds
                ),

            stake:
                Number(
                    changes.stake ??
                    currentBet.stake
                )

        };


        /*
         * Se a aposta já estiver resolvida,
         * recalculamos automaticamente o lucro
         * com a nova odd/stake.
         */

        if (
            updatedBet.status === 'won' ||
            updatedBet.status === 'lost'
        ) {

            updatedBet.profit =
                this.calculateProfit(
                    updatedBet,
                    updatedBet.status
                );

        } else {

            /*
             * Uma aposta pendente nunca
             * tem lucro realizado.
             */

            updatedBet.profit = 0;

        }


        bets[index] =
            updatedBet;


        this.save(bets);


        return updatedBet;

    },


    /* =========================
       REMOVER
    ========================== */

    remove(id) {

        const bets =
            this.load();


        const filtered =
            bets.filter(
                bet => bet.id !== id
            );


        this.save(filtered);


        return true;

    },


    /* =========================
       ALTERAR ESTADO
    ========================== */

    setStatus(id, status) {

        const bet =
            this.getById(id);


        if (!bet) {

            throw new Error(
                'Aposta não encontrada.'
            );

        }


        if (
            status !== 'won' &&
            status !== 'lost' &&
            status !== 'pending'
        ) {

            throw new Error(
                'Estado de aposta inválido.'
            );

        }


        const profit =
            this.calculateProfit(
                bet,
                status
            );


        return this.update(
            id,
            {

                status,

                profit

            }
        );

    },


    /* =========================
       TODAS
    ========================== */

    getAll() {

        return this.load();

    },


    /* =========================
       POR ID
    ========================== */

    getById(id) {

        return this.load().find(
            bet => bet.id === id
        );

    }

};


/* =========================
   INTERFACE
========================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        setupBetModal();

        renderBets();

        setDefaultBetDate();

        setupStakeRecommendation();

    }
);


/* =========================
   MODAL
========================== */

function setupBetModal() {

    const openButton =
        document.getElementById(
            'new-bet-button'
        );


    const closeButton =
        document.getElementById(
            'close-bet-modal'
        );


    const cancelButton =
        document.getElementById(
            'cancel-bet'
        );


    const modal =
        document.getElementById(
            'bet-modal'
        );


    const form =
        document.getElementById(
            'bet-form'
        );


    if (
        !openButton ||
        !modal ||
        !form
    ) {

        console.error(
            'Elementos do modal de aposta não encontrados.'
        );

        return;

    }


    openButton.addEventListener(
        'click',
        () => {

            prepareNewBetForm();

            modal.style.display =
                'flex';

        }
    );


    if (closeButton) {

        closeButton.addEventListener(
            'click',
            () => {

                closeBetModal();

            }
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            'click',
            () => {

                closeBetModal();

            }
        );

    }


    form.addEventListener(
        'submit',
        event => {

            event.preventDefault();

            saveBetFromForm();

        }
    );

}


/* =========================
   NOVA APOSTA
========================== */

function prepareNewBetForm() {

    const form =
        document.getElementById(
            'bet-form'
        );


    const modalTitle =
        document.querySelector(
            '#bet-modal .modal-header h2'
        );


    const modalDescription =
        document.querySelector(
            '#bet-modal .modal-header p'
        );


    const submitButton =
        document.querySelector(
            '#bet-form button[type="submit"]'
        );


    if (form) {

        form.reset();

    }


    if (modalTitle) {

        modalTitle.textContent =
            'Nova aposta';

    }


    if (modalDescription) {

        modalDescription.textContent =
            'Regista uma nova aposta';

    }


    if (submitButton) {

        submitButton.textContent =
            'Guardar aposta';

    }


    if (form) {

        delete form.dataset.editingId;

    }


    setDefaultBetDate();

    updateStakeRecommendation();

}


/* =========================
   FECHAR MODAL
========================== */

function closeBetModal() {

    const modal =
        document.getElementById(
            'bet-modal'
        );


    const form =
        document.getElementById(
            'bet-form'
        );


    if (modal) {

        modal.style.display =
            'none';

    }


    if (form) {

        form.reset();

        delete form.dataset.editingId;

    }


    setDefaultBetDate();

    updateStakeRecommendation();

}


/* =========================
   DATA
========================== */

function setDefaultBetDate() {

    const input =
        document.getElementById(
            'bet-date'
        );


    if (
        !input ||
        input.value
    ) {

        return;

    }


    const today =
        new Date()
            .toISOString()
            .split('T')[0];


    input.value =
        today;

}


/* =========================
   STAKE
========================== */

function setupStakeRecommendation() {

    const stakeInput =
        document.getElementById(
            'bet-stake'
        );


    const recommendedButton =
        document.getElementById(
            'use-recommended-stake'
        );


    if (recommendedButton) {

        recommendedButton.addEventListener(
            'click',
            useRecommendedStake
        );

    }


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


    if (stakeInput) {

        stakeInput.addEventListener(
            'input',
            updateStakeRecommendation
        );

    }


    if (method) {

        method.addEventListener(
            'change',
            updateStakeRecommendation
        );

    }


    if (defaultPercentage) {

        defaultPercentage.addEventListener(
            'input',
            updateStakeRecommendation
        );

    }


    if (maxPercentage) {

        maxPercentage.addEventListener(
            'input',
            updateStakeRecommendation
        );

    }


    if (maxExposure) {

        maxExposure.addEventListener(
            'input',
            updateStakeRecommendation
        );

    }


    if (unitValue) {

        unitValue.addEventListener(
            'input',
            updateStakeRecommendation
        );

    }

}


/* =========================
   CALCULAR STAKE
========================== */

function calculateStakeData(
    editingId = null
) {

    const bankrollData =
        Bankroll.get();


    const bets =
        Bets.getAll();


    const currentBankroll =
        Number(
            bankrollData.initialBankroll
        ) +
        bets.reduce(
            (total, bet) => {

                if (
                    bet.status === 'won' ||
                    bet.status === 'lost'
                ) {

                    return total +
                        Number(
                            bet.profit || 0
                        );

                }

                return total;

            },
            0
        );


    /*
     * Se estivermos a editar uma aposta
     * pendente, retiramos a stake antiga
     * dessa aposta da exposição.
     *
     * Assim calculamos a exposição como ela
     * ficará depois da edição, e não como se
     * estivéssemos a adicionar uma segunda aposta.
     */

    const pendingStake =
        bets.reduce(
            (total, bet) => {

                if (
                    bet.status === 'pending' &&
                    bet.id !== editingId
                ) {

                    return total +
                        Number(
                            bet.stake || 0
                        );

                }

                return total;

            },
            0
        );


    const availableBankroll =
        Math.max(
            0,
            currentBankroll -
            pendingStake
        );


    let settings = {

        method:
            'percentage',

        defaultPercentage:
            1,

        maxPercentage:
            3,

        maxExposure:
            10,

        unitValue:
            10

    };


    if (
        typeof StakeSettings !==
        'undefined'
    ) {

        settings =
            StakeSettings.get();

    }


    const defaultPercentage =
        Number(
            settings.defaultPercentage
        );


    const maxPercentage =
        Number(
            settings.maxPercentage
        );


    const maxExposure =
        Number(
            settings.maxExposure
        );


    const unitValue =
        Number(
            settings.unitValue
        );


    let recommendedStake;


    if (
        settings.method ===
        'units'
    ) {

        recommendedStake =
            unitValue;

    } else if (
        settings.method ===
        'fixed'
    ) {

        recommendedStake =
            unitValue;

    } else {

        recommendedStake =
            availableBankroll *
            (
                defaultPercentage /
                100
            );

    }


    const percentageLimit =
        availableBankroll *
        (
            maxPercentage /
            100
        );


    const exposureLimit =
        currentBankroll *
        (
            maxExposure /
            100
        );


    const remainingExposure =
        Math.max(
            0,
            exposureLimit -
            pendingStake
        );


    const maximumStake =
        Math.max(
            0,
            Math.min(
                percentageLimit,
                remainingExposure,
                availableBankroll
            )
        );


    return {

        currentBankroll,

        pendingStake,

        availableBankroll,

        recommendedStake,

        percentageLimit,

        exposureLimit,

        remainingExposure,

        maximumStake,

        settings

    };

}


/* =========================
   ATUALIZAR STAKE
========================== */

function updateStakeRecommendation() {

    const stakeInput =
        document.getElementById(
            'bet-stake'
        );


    const recommendation =
        document.getElementById(
            'stake-recommendation'
        );


    const maximum =
        document.getElementById(
            'stake-maximum'
        );


    const exposureInfo =
        document.getElementById(
            'stake-exposure-info'
        );


    if (
        !stakeInput ||
        !recommendation ||
        !maximum ||
        !exposureInfo
    ) {

        return;

    }


    const form =
        document.getElementById(
            'bet-form'
        );


    const editingId =
        form?.dataset.editingId ||
        null;


    const data =
        calculateStakeData(
            editingId
        );


    recommendation.textContent =
        `Stake recomendada: ${formatMoney(
            data.recommendedStake
        )}`;


    maximum.textContent =
        `Stake máxima permitida: ${formatMoney(
            data.maximumStake
        )}`;


    const currentStake =
        Number(
            stakeInput.value
        ) || 0;


    const exposureAfter =
        data.currentBankroll > 0

            ? (
                (
                    data.pendingStake +
                    currentStake
                ) /
                data.currentBankroll
            ) * 100

            : 0;


    exposureInfo.textContent =
        `Exposição após esta aposta: ${formatPercent(
            exposureAfter
        )}`;


    if (
        currentStake >
        data.maximumStake &&
        currentStake > 0
    ) {

        maximum.classList.add(
            'stake-warning'
        );

    } else {

        maximum.classList.remove(
            'stake-warning'
        );

    }

}


/* =========================
   STAKE RECOMENDADA
========================== */

function useRecommendedStake() {

    const input =
        document.getElementById(
            'bet-stake'
        );


    if (!input) {

        return;

    }


    const form =
        document.getElementById(
            'bet-form'
        );


    const editingId =
        form?.dataset.editingId ||
        null;


    const data =
        calculateStakeData(
            editingId
        );


    const stake =
        Math.min(
            data.recommendedStake,
            data.maximumStake
        );


    input.value =
        stake.toFixed(2);


    updateStakeRecommendation();

}


/* =========================
   GUARDAR APOSTA
========================== */

function saveBetFromForm() {

    const form =
        document.getElementById(
            'bet-form'
        );


    const bet = {

        date:
            document.getElementById(
                'bet-date'
            ).value,

        competition:
            document.getElementById(
                'bet-competition'
            ).value.trim(),

        homeTeam:
            document.getElementById(
                'bet-home-team'
            ).value.trim(),

        awayTeam:
            document.getElementById(
                'bet-away-team'
            ).value.trim(),

        market:
            document.getElementById(
                'bet-market'
            ).value,

        selection:
            document.getElementById(
                'bet-selection'
            ).value.trim(),

        odds:
            document.getElementById(
                'bet-odds'
            ).value,

        stake:
            document.getElementById(
                'bet-stake'
            ).value

    };


    /* =========================
       VALIDAÇÃO
    ========================== */

    if (
        !bet.date ||
        !bet.competition ||
        !bet.homeTeam ||
        !bet.awayTeam ||
        !bet.market ||
        !bet.selection
    ) {

        alert(
            'Preenche todos os campos da aposta.'
        );

        return;

    }


    if (
        !Number.isFinite(
            Number(bet.odds)
        ) ||
        Number(bet.odds) < 1.01
    ) {

        alert(
            'A odd deve ser igual ou superior a 1.01.'
        );

        return;

    }


    if (
        !Number.isFinite(
            Number(bet.stake)
        ) ||
        Number(bet.stake) <= 0
    ) {

        alert(
            'A stake deve ser superior a 0.'
        );

        return;

    }


    const editingId =
        form.dataset.editingId;


    /*
     * Se estamos a editar,
     * calculamos os limites excluindo
     * a stake antiga da aposta que está
     * a ser editada.
     */

    const stakeData =
        calculateStakeData(
            editingId || null
        );


    if (
        !editingId &&
        Number(bet.stake) >
        stakeData.maximumStake
    ) {

        const confirmBet =
            confirm(
                `A stake de ${formatMoney(
                    bet.stake
                )} ultrapassa o limite recomendado de ${formatMoney(
                    stakeData.maximumStake
                )}.\n\nQueres guardar a aposta na mesma?`
            );


        if (!confirmBet) {

            return;

        }

    }


    try {

        if (editingId) {

            Bets.update(
                editingId,
                bet
            );


            showBetMessage(
                'Aposta alterada com sucesso.'
            );

        } else {

            Bets.add(bet);


            showBetMessage(
                'Aposta guardada com sucesso.'
            );

        }


        renderBets();


        /*
         * Atualiza o Dashboard
         */

        if (
            typeof updateDashboard ===
            'function'
        ) {

            updateDashboard();

        }


        closeBetModal();

    } catch (error) {

        console.error(
            'Erro ao guardar aposta:',
            error
        );


        alert(
            'Ocorreu um erro ao guardar a aposta.'
        );

    }

}


/* =========================
   EDITAR APOSTA
========================== */

function editBet(id) {

    const bet =
        Bets.getById(id);


    if (!bet) {

        alert(
            'Aposta não encontrada.'
        );

        return;

    }


    const modal =
        document.getElementById(
            'bet-modal'
        );


    const form =
        document.getElementById(
            'bet-form'
        );


    if (
        !modal ||
        !form
    ) {

        return;

    }


    form.dataset.editingId =
        id;


    document.getElementById(
        'bet-date'
    ).value =
        bet.date || '';


    document.getElementById(
        'bet-competition'
    ).value =
        bet.competition || '';


    document.getElementById(
        'bet-home-team'
    ).value =
        bet.homeTeam || '';


    document.getElementById(
        'bet-away-team'
    ).value =
        bet.awayTeam || '';


    document.getElementById(
        'bet-market'
    ).value =
        bet.market || '';


    document.getElementById(
        'bet-selection'
    ).value =
        bet.selection || '';


    document.getElementById(
        'bet-odds'
    ).value =
        bet.odds || '';


    document.getElementById(
        'bet-stake'
    ).value =
        bet.stake || '';


    const modalTitle =
        document.querySelector(
            '#bet-modal .modal-header h2'
        );


    const modalDescription =
        document.querySelector(
            '#bet-modal .modal-header p'
        );


    const submitButton =
        document.querySelector(
            '#bet-form button[type="submit"]'
        );


    if (modalTitle) {

        modalTitle.textContent =
            'Editar aposta';

    }


    if (modalDescription) {

        modalDescription.textContent =
            'Altera os dados da aposta';

    }


    if (submitButton) {

        submitButton.textContent =
            'Guardar alterações';

    }


    modal.style.display =
        'flex';


    updateStakeRecommendation();

}


/* =========================
   REMOVER APOSTA
========================== */

function deleteBet(id) {

    const bet =
        Bets.getById(id);


    if (!bet) {

        return;

    }


    const confirmed =
        confirm(
            `Queres mesmo remover a aposta ${bet.homeTeam} vs ${bet.awayTeam}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        Bets.remove(id);


        renderBets();


        if (
            typeof updateDashboard ===
            'function'
        ) {

            updateDashboard();

        }


        showBetMessage(
            'Aposta removida com sucesso.'
        );

    } catch (error) {

        console.error(
            'Erro ao remover aposta:',
            error
        );


        alert(
            'Não foi possível remover a aposta.'
        );

    }

}


/* =========================
   GANHA
========================== */

function markBetWon(id) {

    try {

        Bets.setStatus(
            id,
            'won'
        );


        renderBets();


        if (
            typeof updateDashboard ===
            'function'
        ) {

            updateDashboard();

        }


        showBetMessage(
            'Aposta marcada como ganha.'
        );

    } catch (error) {

        console.error(error);


        alert(
            'Não foi possível alterar o estado da aposta.'
        );

    }

}


/* =========================
   PERDIDA
========================== */

function markBetLost(id) {

    try {

        Bets.setStatus(
            id,
            'lost'
        );


        renderBets();


        if (
            typeof updateDashboard ===
            'function'
        ) {

            updateDashboard();

        }


        showBetMessage(
            'Aposta marcada como perdida.'
        );

    } catch (error) {

        console.error(error);


        alert(
            'Não foi possível alterar o estado da aposta.'
        );

    }

}


/* =========================
   VOLTAR A PENDENTE
========================== */

function markBetPending(id) {

    try {

        Bets.setStatus(
            id,
            'pending'
        );


        renderBets();


        if (
            typeof updateDashboard ===
            'function'
        ) {

            updateDashboard();

        }


        showBetMessage(
            'Aposta voltou a ficar pendente.'
        );

    } catch (error) {

        console.error(error);


        alert(
            'Não foi possível alterar o estado da aposta.'
        );

    }

}


/* =========================
   RENDER APOSTAS
========================== */

function renderBets() {

    const bets =
        Bets.getAll();


    const tableBody =
        document.getElementById(
            'bets-table-body'
        );


    const emptyState =
        document.getElementById(
            'bets-empty-state'
        );


    if (
        !tableBody ||
        !emptyState
    ) {

        return;

    }


    tableBody.innerHTML =
        '';


    if (
        bets.length === 0
    ) {

        emptyState.style.display =
            'flex';

        return;

    }


    emptyState.style.display =
        'none';


    bets.forEach(
        bet => {

            const row =
                document.createElement(
                    'tr'
                );


            let statusText =
                'Pendente';


            let statusClass =
                'pending';


            if (
                bet.status ===
                'won'
            ) {

                statusText =
                    'Ganha';

                statusClass =
                    'won';

            }


            if (
                bet.status ===
                'lost'
            ) {

                statusText =
                    'Perdida';

                statusClass =
                    'lost';

            }


            let profitText =
                '—';


            if (
                bet.status ===
                'won'
            ) {

                profitText =
                    `+${formatMoney(
                        bet.profit
                    )}`;

            }


            if (
                bet.status ===
                'lost'
            ) {

                profitText =
                    formatMoney(
                        bet.profit
                    );

            }


            let actionButtons =
                '';


            if (
                bet.status ===
                'pending'
            ) {

                actionButtons = `

                    <button
                        class="bet-action-button won"
                        onclick="markBetWon('${bet.id}')"
                        title="Marcar como ganha"
                    >
                        ✓ Ganha
                    </button>


                    <button
                        class="bet-action-button lost"
                        onclick="markBetLost('${bet.id}')"
                        title="Marcar como perdida"
                    >
                        ✕ Perdida
                    </button>

                `;

            } else {

                actionButtons = `

                    <button
                        class="bet-action-button pending"
                        onclick="markBetPending('${bet.id}')"
                        title="Voltar a pendente"
                    >
                        ↩ Pendente
                    </button>

                `;

            }


            actionButtons += `

                <button
                    class="bet-action-button edit"
                    onclick="editBet('${bet.id}')"
                    title="Editar aposta"
                >
                    ✎ Editar
                </button>


                <button
                    class="bet-action-button delete"
                    onclick="deleteBet('${bet.id}')"
                    title="Remover aposta"
                >
                    🗑 Remover
                </button>

            `;


            row.innerHTML = `

                <td>
                    ${formatBetDate(
                        bet.date
                    )}
                </td>


                <td>

                    <strong>
                        ${escapeHtml(
                            bet.homeTeam
                        )}
                    </strong>

                    <span class="match-separator">
                        vs
                    </span>

                    <strong>
                        ${escapeHtml(
                            bet.awayTeam
                        )}
                    </strong>

                </td>


                <td>
                    ${escapeHtml(
                        bet.market
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        bet.selection
                    )}
                </td>


                <td>
                    ${Number(
                        bet.odds
                    ).toFixed(2)}
                </td>


                <td>
                    ${formatMoney(
                        bet.stake
                    )}
                </td>


                <td>

                    <span
                        class="status ${statusClass}"
                    >
                        ${statusText}
                    </span>

                </td>


                <td
                    class="${
                        bet.status === 'won'
                            ? 'profit-positive'
                            : bet.status === 'lost'
                                ? 'profit-negative'
                                : ''
                    }"
                >

                    ${profitText}

                </td>


                <td>

                    <div class="bet-actions">

                        ${actionButtons}

                    </div>

                </td>

            `;


            tableBody.appendChild(
                row
            );

        }
    );

}


/* =========================
   MENSAGEM
========================== */

function showBetMessage(message) {

    let element =
        document.getElementById(
            'bet-save-message'
        );


    if (!element) {

        element =
            document.createElement(
                'div'
            );


        element.id =
            'bet-save-message';


        element.className =
            'settings-message success';


        const betsPage =
            document.getElementById(
                'bets-page'
            );


        if (betsPage) {

            const topbar =
                betsPage.querySelector(
                    '.topbar'
                );


            if (topbar) {

                topbar.after(
                    element
                );

            }

        }

    }


    element.textContent =
        message;


    element.className =
        'settings-message success';


    clearTimeout(
        window.betMessageTimeout
    );


    window.betMessageTimeout =
        setTimeout(
            () => {

                element.textContent =
                    '';

            },
            3000
        );

}


/* =========================
   DATA
========================== */

function formatBetDate(date) {

    if (!date) {

        return '-';

    }


    const parts =
        date.split('-');


    if (
        parts.length !== 3
    ) {

        return date;

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


/* =========================
   DINHEIRO
========================== */

function formatMoney(value) {

    return new Intl.NumberFormat(
        'pt-PT',
        {
            style: 'currency',
            currency: 'EUR'
        }
    ).format(
        Number(value)
    );

}


/* =========================
   PERCENTAGEM
========================== */

function formatPercent(value) {

    return `${Number(
        value
    ).toFixed(
        2
    ).replace(
        '.',
        ','
    )}%`;

}


/* =========================
   SEGURANÇA
========================== */

function escapeHtml(value) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        value ?? '';


    return div.innerHTML;

}


/* =========================
   GLOBAL
========================== */

window.Bets =
    Bets;

window.editBet =
    editBet;

window.deleteBet =
    deleteBet;

window.markBetWon =
    markBetWon;

window.markBetLost =
    markBetLost;

window.markBetPending =
    markBetPending;