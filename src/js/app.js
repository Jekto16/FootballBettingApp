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
    }).format(value);
}

function formatPercent(value) {
    return `${value.toFixed(2).replace('.', ',')}%`;
}


/* =========================
   DASHBOARD
========================= */

function updateDashboard() {
    const data = Bankroll.get();

    const bankrollElements = document.querySelectorAll(
        '[data-bankroll]'
    );

    bankrollElements.forEach(element => {
        element.textContent = formatMoney(
            data.currentBankroll
        );
    });

    const profitElement =
        document.querySelector('[data-profit]');

    if (profitElement) {
        profitElement.textContent =
            formatMoney(data.totalProfit);
    }

    const roiElement =
        document.querySelector('[data-roi]');

    if (roiElement) {
        roiElement.textContent =
            formatPercent(Bankroll.getROI());
    }

    const betsElement =
        document.querySelector('[data-bets]');

    if (betsElement) {
        betsElement.textContent =
            data.totalBets;
    }
}


/* =========================
   NAVEGAÇÃO
========================= */

function setupNavigation() {
    const navItems =
        document.querySelectorAll('.nav-item[data-page]');

    navItems.forEach(item => {
        item.addEventListener('click', () => {

            const page =
                item.dataset.page;

            showPage(page);

            navItems.forEach(navItem => {
                navItem.classList.remove('active');
            });

            item.classList.add('active');
        });
    });
}

function showPage(page) {

    const dashboard =
        document.getElementById('dashboard-page');

    const settings =
        document.getElementById('settings-page');

    if (dashboard) {
        dashboard.style.display =
            page === 'dashboard'
                ? 'block'
                : 'none';
    }

    if (settings) {
        settings.style.display =
            page === 'settings'
                ? 'block'
                : 'none';
    }
}


/* =========================
   DEFINIÇÕES DA BANCA
========================= */

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

        if (!Number.isFinite(amount) || amount < 0) {

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


/* =========================
   CARREGAR DEFINIÇÕES
========================= */

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