const Bets = {
    STORAGE_KEY: 'footballBettingApp_bets',

    load() {
        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (!saved) {
            return [];
        }

        try {
            return JSON.parse(saved);
        } catch (error) {
            console.error('Erro ao carregar apostas:', error);
            return [];
        }
    },

    save(bets) {
        localStorage.setItem(
            this.STORAGE_KEY,
            JSON.stringify(bets)
        );
    },

    add(bet) {
        const bets = this.load();

        const newBet = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),

            date: bet.date,
            competition: bet.competition,
            homeTeam: bet.homeTeam,
            awayTeam: bet.awayTeam,
            market: bet.market,
            selection: bet.selection,

            odds: Number(bet.odds),
            stake: Number(bet.stake),

            status: 'pending',
            profit: 0
        };

        bets.unshift(newBet);

        this.save(bets);

        return newBet;
    },

    getAll() {
        return this.load();
    },

    getById(id) {
        return this.load().find(
            bet => bet.id === id
        );
    },

    update(id, data) {
        const bets = this.load();

        const index = bets.findIndex(
            bet => bet.id === id
        );

        if (index === -1) {
            return null;
        }

        const existingBet = bets[index];

        bets[index] = {
            ...existingBet,

            date: data.date,
            competition: data.competition,
            homeTeam: data.homeTeam,
            awayTeam: data.awayTeam,
            market: data.market,
            selection: data.selection,

            odds: Number(data.odds),
            stake: Number(data.stake)
        };

        this.save(bets);

        return bets[index];
    },

    remove(id) {
        const bets = this.load();

        const filteredBets = bets.filter(
            bet => bet.id !== id
        );

        if (filteredBets.length === bets.length) {
            return false;
        }

        this.save(filteredBets);

        return true;
    },

    settle(id, status) {
        const bets = this.load();

        const index = bets.findIndex(
            bet => bet.id === id
        );

        if (index === -1) {
            return null;
        }

        const bet = bets[index];

        if (status === 'won') {

            bet.status = 'won';

            bet.profit =
                Number(bet.stake) *
                (Number(bet.odds) - 1);

        } else if (status === 'lost') {

            bet.status = 'lost';

            bet.profit =
                -Number(bet.stake);

        } else if (status === 'pending') {

            bet.status = 'pending';

            bet.profit = 0;

        } else {

            return null;
        }

        bet.settledAt =
            status === 'pending'
                ? null
                : new Date().toISOString();

        this.save(bets);

        return bet;
    }
};


/* =========================
   INTERFACE
========================= */

document.addEventListener('DOMContentLoaded', () => {

    setupBetModal();
    renderBets();
    setDefaultBetDate();

});


let editingBetId = null;


/* =========================
   MODAL
========================= */

function setupBetModal() {

    const openButton =
        document.getElementById('new-bet-button');

    const closeButton =
        document.getElementById('close-bet-modal');

    const cancelButton =
        document.getElementById('cancel-bet');

    const modal =
        document.getElementById('bet-modal');

    const form =
        document.getElementById('bet-form');


    if (!modal || !form) {
        return;
    }


    if (openButton) {

        openButton.addEventListener('click', () => {

            editingBetId = null;

            resetBetForm();

            setModalTitle('Nova aposta');

            modal.style.display = 'flex';

        });

    }


    if (closeButton) {

        closeButton.addEventListener('click', () => {

            closeBetModal();

        });

    }


    if (cancelButton) {

        cancelButton.addEventListener('click', () => {

            closeBetModal();

        });

    }


    form.addEventListener('submit', event => {

        event.preventDefault();

        saveBetFromForm();

    });

}


/* =========================
   ABRIR EDIÇÃO
========================= */

function editBet(id) {

    const bet =
        Bets.getById(id);


    if (!bet) {
        return;
    }


    editingBetId = id;


    document.getElementById('bet-date').value =
        bet.date || '';

    document.getElementById('bet-competition').value =
        bet.competition || '';

    document.getElementById('bet-home-team').value =
        bet.homeTeam || '';

    document.getElementById('bet-away-team').value =
        bet.awayTeam || '';

    document.getElementById('bet-market').value =
        bet.market || '';

    document.getElementById('bet-selection').value =
        bet.selection || '';

    document.getElementById('bet-odds').value =
        bet.odds;

    document.getElementById('bet-stake').value =
        bet.stake;


    setModalTitle('Editar aposta');


    const modal =
        document.getElementById('bet-modal');


    if (modal) {
        modal.style.display = 'flex';
    }

}


/* =========================
   GUARDAR APOSTA
========================= */

function saveBetFromForm() {

    const bet = {

        date:
            document.getElementById('bet-date').value,

        competition:
            document.getElementById('bet-competition').value.trim(),

        homeTeam:
            document.getElementById('bet-home-team').value.trim(),

        awayTeam:
            document.getElementById('bet-away-team').value.trim(),

        market:
            document.getElementById('bet-market').value,

        selection:
            document.getElementById('bet-selection').value.trim(),

        odds:
            document.getElementById('bet-odds').value,

        stake:
            document.getElementById('bet-stake').value

    };


    if (Number(bet.odds) < 1.01) {

        alert(
            'A odd deve ser igual ou superior a 1.01.'
        );

        return;
    }


    if (Number(bet.stake) <= 0) {

        alert(
            'A stake deve ser superior a 0.'
        );

        return;
    }


    if (editingBetId) {

        Bets.update(
            editingBetId,
            bet
        );

    } else {

        Bets.add(bet);

    }


    renderBets();

    closeBetModal();


    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }

}


/* =========================
   REMOVER APOSTA
========================= */

function deleteBet(id) {

    const bet =
        Bets.getById(id);


    if (!bet) {
        return;
    }


    const confirmed =
        confirm(
            `Tens a certeza que queres remover a aposta ${bet.homeTeam} vs ${bet.awayTeam}?`
        );


    if (!confirmed) {
        return;
    }


    Bets.remove(id);


    renderBets();


    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }

}


/* =========================
   RESOLVER APOSTA
========================= */

function settleBet(id, status) {

    const bet =
        Bets.getById(id);


    if (!bet) {
        return;
    }


    if (status === 'won') {

        const confirmed =
            confirm(
                `Marcar a aposta ${bet.homeTeam} vs ${bet.awayTeam} como GANHA?`
            );


        if (!confirmed) {
            return;
        }

    }


    if (status === 'lost') {

        const confirmed =
            confirm(
                `Marcar a aposta ${bet.homeTeam} vs ${bet.awayTeam} como PERDIDA?`
            );


        if (!confirmed) {
            return;
        }

    }


    Bets.settle(
        id,
        status
    );


    renderBets();


    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }

}


/* =========================
   FECHAR MODAL
========================= */

function closeBetModal() {

    const modal =
        document.getElementById('bet-modal');

    if (modal) {
        modal.style.display = 'none';
    }


    resetBetForm();

}


/* =========================
   RESET FORMULÁRIO
========================= */

function resetBetForm() {

    const form =
        document.getElementById('bet-form');


    if (form) {
        form.reset();
    }


    editingBetId = null;


    setDefaultBetDate();

    setModalTitle('Nova aposta');

}


/* =========================
   TÍTULO DO MODAL
========================= */

function setModalTitle(title) {

    const modalTitle =
        document.querySelector(
            '#bet-modal .modal-header h2'
        );


    if (modalTitle) {
        modalTitle.textContent = title;
    }

}


/* =========================
   DATA POR DEFEITO
========================= */

function setDefaultBetDate() {

    const input =
        document.getElementById('bet-date');


    if (!input || input.value) {
        return;
    }


    const today =
        new Date().toISOString().split('T')[0];


    input.value = today;

}


/* =========================
   RENDER TABELA
========================= */

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


    if (!tableBody || !emptyState) {
        return;
    }


    tableBody.innerHTML = '';


    if (bets.length === 0) {

        emptyState.style.display = 'flex';

        return;

    }


    emptyState.style.display = 'none';


    bets.forEach(bet => {

        const row =
            document.createElement('tr');


        let statusText =
            'Pendente';

        let statusClass =
            'pending';


        if (bet.status === 'won') {

            statusText =
                'Ganha';

            statusClass =
                'won';

        }


        if (bet.status === 'lost') {

            statusText =
                'Perdida';

            statusClass =
                'lost';

        }


        let profitText = '—';


        if (bet.status === 'won') {

            profitText =
                `+${formatMoney(bet.profit)}`;

        }


        if (bet.status === 'lost') {

            profitText =
                formatMoney(bet.profit);

        }


        row.innerHTML = `

            <td>
                ${formatBetDate(bet.date)}
            </td>

            <td>

                <strong>
                    ${escapeHtml(bet.homeTeam)}
                </strong>

                <span class="match-separator">
                    vs
                </span>

                <strong>
                    ${escapeHtml(bet.awayTeam)}
                </strong>

            </td>

            <td>
                ${escapeHtml(bet.market)}
            </td>

            <td>
                ${escapeHtml(bet.selection)}
            </td>

            <td>
                ${Number(bet.odds).toFixed(2)}
            </td>

            <td>
                ${formatMoney(bet.stake)}
            </td>

            <td>

                <span class="status ${statusClass}">
                    ${statusText}
                </span>

            </td>

            <td>
                ${profitText}
            </td>

            <td>

                <div class="bet-actions">

                    ${
                        bet.status === 'pending'
                            ? `
                                <button
                                    class="bet-action-button won"
                                    onclick="settleBet('${bet.id}', 'won')"
                                    title="Marcar como ganha"
                                >
                                    ✓
                                </button>

                                <button
                                    class="bet-action-button lost"
                                    onclick="settleBet('${bet.id}', 'lost')"
                                    title="Marcar como perdida"
                                >
                                    ✕
                                </button>
                            `
                            : ''
                    }

                    <button
                        class="bet-action-button edit"
                        onclick="editBet('${bet.id}')"
                        title="Editar aposta"
                    >
                        ✏️
                    </button>

                    <button
                        class="bet-action-button delete"
                        onclick="deleteBet('${bet.id}')"
                        title="Remover aposta"
                    >
                        🗑️
                    </button>

                </div>

            </td>

        `;


        tableBody.appendChild(row);

    });

}


/* =========================
   FORMATAÇÃO DATA
========================= */

function formatBetDate(date) {

    if (!date) {
        return '-';
    }


    const parts =
        date.split('-');


    if (parts.length !== 3) {
        return date;
    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


/* =========================
   FORMATAÇÃO DINHEIRO
========================= */

function formatMoney(value) {

    return new Intl.NumberFormat('pt-PT', {

        style: 'currency',

        currency: 'EUR'

    }).format(Number(value));

}


/* =========================
   SEGURANÇA HTML
========================= */

function escapeHtml(value) {

    const div =
        document.createElement('div');


    div.textContent =
        value;


    return div.innerHTML;

}


window.Bets = Bets;
window.editBet = editBet;
window.deleteBet = deleteBet;
window.settleBet = settleBet;