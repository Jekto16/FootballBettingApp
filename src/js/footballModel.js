/* =========================
   FOOTBALL MODEL — BRIDGE
========================== */

const FootballModel = {

    async estimate(payload) {

        if (
            typeof window === 'undefined' ||
            !window.footballModelAPI ||
            typeof window.footballModelAPI.estimate !== 'function'
        ) {

            return {
                ok: false,
                message:
                    'A ligação ao modelo estatístico não está disponível.'
            };

        }

        try {

            return await window.footballModelAPI.estimate(payload);

        } catch (error) {

            console.error(
                'FootballModel.estimate:',
                error
            );

            return {
                ok: false,
                message:
                    error?.message ||
                    'Não foi possível calcular a probabilidade.'
            };

        }

    },

    async getLeagueSummary(leagueKey) {

        if (
            typeof window === 'undefined' ||
            !window.footballModelAPI ||
            typeof window.footballModelAPI.getLeagueSummary !== 'function'
        ) {

            return {
                ok: false,
                message:
                    'A ligação ao modelo estatístico não está disponível.'
            };

        }

        try {

            return await window.footballModelAPI.getLeagueSummary(
                leagueKey
            );

        } catch (error) {

            console.error(
                'FootballModel.getLeagueSummary:',
                error
            );

            return {
                ok: false,
                message:
                    error?.message ||
                    'Não foi possível carregar os dados da competição.'
            };

        }

    },

    async getLeagueTeams(leagueKey) {

        if (
            typeof window === 'undefined' ||
            !window.footballModelAPI ||
            typeof window.footballModelAPI.getLeagueTeams !== 'function'
        ) {

            return {
                ok: false,
                message:
                    'A ligação ao modelo estatístico não está disponível.'
            };

        }

        try {

            return await window.footballModelAPI.getLeagueTeams(
                leagueKey
            );

        } catch (error) {

            console.error(
                'FootballModel.getLeagueTeams:',
                error
            );

            return {
                ok: false,
                message:
                    error?.message ||
                    'Não foi possível carregar as equipas da época atual.'
            };

        }

    },

    async getLeagues() {

        if (
            typeof window === 'undefined' ||
            !window.footballModelAPI ||
            typeof window.footballModelAPI.getLeagues !== 'function'
        ) {

            return [];

        }

        try {

            return await window.footballModelAPI.getLeagues();

        } catch (error) {

            console.error(
                'FootballModel.getLeagues:',
                error
            );

            return [];

        }

    }

};

window.FootballModel = FootballModel;
