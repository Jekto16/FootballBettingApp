document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupBankrollSettings();
    updateDashboard();
    loadSettings();
});

function formatMoney(value) {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    }).format(Number(value));
}

function formatPercent(value) {
    return `${Number(value).toFixed(2).replace('.', ',')}%`;
}

function updateDashboard() {

    const bankrollData = Bankroll.get();

    const bets =
        typeof Bets !== 'undefined'
            ? Bets.getAll()
            : [];


    /* =========================
       LUCRO REALIZADO
    ========================== */

    const totalProfit = bets.reduce(
        (total, bet) => {

            if (
                bet.status === 'won' ||
                bet.status === 'lost'
            ) {
                return total + Number(bet.profit || 0);
            }

            return total;

        },
        0
    );


    /* =========================
       STAKE RESOLVIDA
    ========================== */

    const totalStake = bets.reduce(
        (total, bet) => {

            if (
                bet.status === 'won' ||
                bet.status === 'lost'
            ) {
                return total + Number(bet.stake || 0);
            }

            return total;

        },
        0
    );


    /* =========================
       STAKE PENDENTE
    ========================== */

    const pendingStake = bets.reduce(
        (total, bet) => {

            if (bet.status === 'pending') {
                return total + Number(bet.stake || 0);
            }

            return total;

        },
        0
    );


    /* =========================
       ROI
    ========================== */

    const roi =
        totalStake > 0
            ? (totalProfit / totalStake) * 100
            : 0;


    /* =========================
       BANCA TOTAL
    ========================== */

    const currentBankroll =
        Number(bankrollData.initialBankroll) +
        totalProfit;


    /* =========================
       BANCA DISPONÍVEL
    ========================== */

    const availableBankroll =
        currentBankroll -
        pendingStake;


    /* =========================
       EXPOSIÇÃO
    ========================== */

    const exposure =
        currentBankroll > 0
            ? (pendingStake / currentBankroll) * 100
            : 0;


    /* =========================
       BANCA TOTAL
    ========================== */

    const bankrollElements =
        document.querySelectorAll(
            '[data-bankroll]'
        );


    bankrollElements.forEach(element => {

        element.textContent =
            formatMoney(currentBankroll);

    });


    /* =========================
       BANCA DISPONÍVEL
    ========================== */

    const availableElement =
        document.querySelector(
            '[data-available-bankroll]'
        );


    if (availableElement) {

        availableElement.textContent =
            formatMoney(availableBankroll);

    }


    /* =========================
       EM APOSTAS
    ========================== */

    const pendingStakeElement =
        document.querySelector(
            '[data-pending-stake]'
        );


    if (pendingStakeElement) {

        pendingStakeElement.textContent =
            formatMoney(pendingStake);

    }


    /* =========================
       EXPOSIÇÃO
    ========================== */

    const exposureElement =
        document.querySelector(
            '[data-exposure]'
        );


    if (exposureElement) {

        exposureElement.textContent =
            formatPercent(exposure);

    }


    /* =========================
       LUCRO
    ========================== */

    const profitElement =
        document.querySelector(
            '[data-profit]'
        );


    if (profitElement) {

        profitElement.textContent =
            formatMoney(totalProfit);

    }


    /* =========================
       ROI
    ========================== */

    const roiElement =
        document.querySelector(
            '[data-roi]'
        );


    if (roiElement) {

        roiElement.textContent =
            formatPercent(roi);

    }


    /* =========================
       NÚMERO DE APOSTAS
    ========================== */

    const betsElement =
        document.querySelector(
            '[data-bets]'
        );


    if (betsElement) {

        betsElement.textContent =
            bets.length;

    }


    /* =========================
       ÚLTIMAS APOSTAS
    ========================== */

    renderDashboardBets(bets);
}

function renderDashboardBets(bets) {

    const dashboardPanel =
        document.querySelector(
            '#dashboard-page .content-grid .panel:nth-child(2)'
        );

    if (!dashboardPanel) {
        return;
    }

    const emptyState =
        dashboardPanel.querySelector('.empty-state');

    const existingList =
        dashboardPanel.querySelector('.dashboard-bets-list');

    if (bets.length === 0) {

        if (emptyState) {
            emptyState.style.display = 'flex';
        }

        if (existingList) {
            existingList.remove();
        }

        return;
    }

    if (emptyState) {
        emptyState.style.display = 'none';
    }

    const recentBets = bets.slice(0, 5);

    let list = existingList;

    if (!list) {

        list = document.createElement('div');

        list.className = 'dashboard-bets-list';

        dashboardPanel.appendChild(list);
    }

    list.innerHTML = '';

    recentBets.forEach(bet => {

        const item = document.createElement('div');

        item.className = 'dashboard-bet-item';

        let statusText = 'Pendente';

        let statusClass = 'pending';

        if (bet.status === 'won') {
            statusText = 'Ganha';
            statusClass = 'won';
        }

        if (bet.status === 'lost') {
            statusText = 'Perdida';
            statusClass = 'lost';
        }

        item.innerHTML = `
            <div class="dashboard-bet-main">

                <strong>
                    ${escapeHtml(bet.homeTeam)}
                    <span>vs</span>
                    ${escapeHtml(bet.awayTeam)}
                </strong>

                <small>
                    ${escapeHtml(bet.selection)}
                    @ ${Number(bet.odds).toFixed(2)}
                </small>

            </div>

            <div class="dashboard-bet-right">

                <strong>
                    ${formatMoney(bet.stake)}
                </strong>

                <span class="status ${statusClass}">
                    ${statusText}
                </span>

            </div>
        `;

        list.appendChild(item);
    });
}

function setupNavigation() {

    const navItems =
        document.querySelectorAll('.nav-item[data-page]');

    navItems.forEach(item => {

        item.addEventListener('click', () => {

            const page = item.dataset.page;

            showPage(page);

            navItems.forEach(navItem => {
                navItem.classList.remove('active');
            });

            item.classList.add('active');

            if (page === 'dashboard') {
                updateDashboard();
            }

        });

    });
}

function showPage(page) {

    const pages = {

        dashboard:
            document.getElementById('dashboard-page'),

        bets:
            document.getElementById('bets-page'),

        settings:
            document.getElementById('settings-page')

    };

    Object.values(pages).forEach(pageElement => {

        if (pageElement) {
            pageElement.style.display = 'none';
        }

    });

    if (pages[page]) {
        pages[page].style.display = 'block';
    }
}

function setupBankrollSettings() {

    const saveButton =
        document.getElementById('save-bankroll');

    if (!saveButton) {
        return;
    }

    saveButton.addEventListener('click', () => {

        const input =
            document.getElementById('initial-bankroll');

        const message =
            document.getElementById('settings-message');

        const amount =
            Number(input.value);

        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {

            message.textContent =
                'Introduz um valor de banca válido.';

            message.className =
                'settings-message error';

            return;
        }

        try {

            Bankroll.setInitialBankroll(amount);

            updateDashboard();

            message.textContent =
                `Banca definida para ${formatMoney(amount)}.`;

            message.className =
                'settings-message success';

        } catch (error) {

            console.error(error);

            message.textContent =
                'Ocorreu um erro ao guardar a banca.';

            message.className =
                'settings-message error';

        }

    });
}

function loadSettings() {

    const input =
        document.getElementById('initial-bankroll');

    if (!input) {
        return;
    }

    const data =
        Bankroll.get();

    input.value =
        data.initialBankroll;
}

function escapeHtml(value) {

    const div =
        document.createElement('div');

    div.textContent =
        value;

    return div.innerHTML;
}