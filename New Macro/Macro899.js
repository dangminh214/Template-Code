    /**
     * @description Kunde löschen 
     * 
     * @author d.nguyen
     * @date 13.03.2024 13:48:01
     * @arguments data = {}
     * @makroname kunde_loeschen
     */

    data = {...data,
        commands: {},
        checks: {},
        ids: {
            MandantID: 1,
            Auftrag_Formular: 7,
            Kunde_Laufzettel_Liste: 41,
            Laufzettel_DQ: 1005,
            Kunde_DB: 921,
            Allgemein_Kufo_Liste: 204,
            Anforderungen_tab_DQ: 174,
            Kunde_Kontakte_Liste: 43,
            Email_DQ: 453,
            Kunde_Besuche_Liste: 48,
            Besuche_DQ: 1004,
            Allgemein_Historie_Liste: 44,
            Historie_DQ: 1003,
            KundengeschenklisteHTV_DQ: 1006,
            KundenvertragswerkHTV_DQ: 1007,
            Archiv_Kunden_DQ: 1008,
            Bewertung_DQ: 1009
        }
    };
    data.KundeID = 9790;
    //data.KundeID = 9788;
    //data.KundeID = Number((new URLSearchParams(window.location.href)).get('data_id'));
    data.neuKundeID = await userAction('remote', {
        header: 'Wählen Sie bitte einen anderen Kunde um die Daten zu verschieben',
        simple_answer: true,
        remote: {
            object_id: data.ids.Kunde_DB,
            fields: ['Eintrag as value', 'Name as text'],
            conditions: ['Name LIKE %{query}%'],
            oder_by: ['Name']
        }
    });

    data.commands.selectAuftrag = await dbAction('select', {
        object_id: data.ids.Auftrag_Formular,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID =  ${data.KundeID}`, 'Mandant_ID = 1']
    });

    data.commands.selectFertigungsauftrag = await dbAction('select', {
        object_id: data.ids.Kunde_Laufzettel_Liste,
        fields: ['Eintrag'],
        conditions: [`AKunde_ID =  ${data.KundeID}`]
    });

    data.commands.selectAnforderungen = await dbAction('select', {
        object_id: data.ids.Allgemein_Kufo_Liste,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID =  ${data.KundeID}`]
    });

    data.commands.selectKontakte = await dbAction('select', {
        object_id: data.ids.Kunde_Kontakte_Liste,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID =  ${data.KundeID}`]
    });

    data.commands.selectBesuche = await dbAction('select', {
        object_id: data.ids.Kunde_Besuche_Liste,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID =  ${data.KundeID}`]
    });

    data.commands.selectGeschenke = await dbAction('select', {
        object_id: data.ids.KundengeschenklisteHTV_DQ,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID =  ${data.KundeID}`]
    });

    data.commands.selectHistorie = await dbAction('select', {
        object_id: data.ids.Allgemein_Historie_Liste,
        fields: ['Eintrag'],
        conditions: [`Daten_ID =  ${data.KundeID}`, 'Untergruppe LIKE Manuell']
    });

    data.commands.selectVertragswerk = await dbAction('select', {
        object_id: data.ids.KundenvertragswerkHTV_DQ,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID = ${data.KundeID}`]
    });

    data.commands.selectDateiabhaenge = await dbAction('select', {
        object_id: data.ids.Archiv_Kunden_DQ,
        fields: ['Eintrag'],
        conditions: [`Link_ID = ${data.KundeID}`]
    });

    data.commands.selectBewertung = await dbAction('select', {
        object_id: data.ids.Bewertung_DQ,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID =  ${data.KundeID}`]
    });

    let check = false;

    async function checkAuftrag() {
        if (data.commands.selectAuftrag.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectAuftrag.DATA.length} Aufträge verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkFertigungsauftrag() {
        if (data.commands.selectFertigungsauftrag.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectFertigungsauftrag.DATA.length} Fertigungsaufträge verschieben`,
                simple_answer: true,
            });

        } else {
            return true;
        }
    }

    async function checkAnforderung() {
        if (data.commands.selectAnforderungen.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectAnforderungen.DATA.length} Anforderungen verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkKontakte() {
        if (data.commands.selectKontakte.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectKontakte.DATA.length} Kontakte verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkBesuche() {
        if (data.commands.selectBesuche.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectBesuche.DATA.length} Besuche verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkHistorie() {
        if (data.commands.selectHistorie.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${selectHistorie.DATA.length} Historie verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkGeschenke() {
        if (data.commands.selectGeschenke.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectGeschenke.DATA.length} Historie verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkVertragswerk() {
        if (data.commands.selectVertragswerk.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectVertragswerk.DATA.length} Vertragswerke verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkDateiabhaenge() {
        if (data.commands.selectDateiabhaenge.DATA.length > 0) {
            return await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectDateiabhaenge.DATA.length} Dateianhänge verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }

    async function checkBewertung() {
        if (data.commands.selectBewertung.DATA.length > 0) {
            data.choice_verschiebenBewertung = await userAction('choice', {
                header: `Wollen Sie ${data.commands.selectBewertung.DATA.length} Bewerungen verschieben`,
                simple_answer: true,
            });
        } else {
            return true;
        }
    }


    data.checks.checkAuftragVar = await checkAuftrag();
    if (!data.checks.checkAuftragVar) {
        showProgress(100);
        return;
    }

    data.checks.checkFertigungsaftragVar = await checkFertigungsauftrag();
    if (!data.checks.checkFertigungsaftragVar) {
        showProgress(100);
        return;
    }

    data.checks.checkAnforderungVar = await checkAnforderung();
    if (!data.checks.checkAnforderungVar) {
        showProgress(100);
        return;
    }

    data.checks.checkKontakteVar = await checkKontakte();
    if (!data.checks.checkKontakteVar) {
        showProgress(100);
        return;
    }

    data.checks.checkBesucheVar = await checkBesuche();
    if (!data.checks.checkBesucheVar) {
        showProgress(100);
        return;
    }

    data.checks.checkHistorieVar = await checkHistorie();
    if (!data.checks.checkHistorieVar) {
        showProgress(100);
        return;
    }

    data.checks.checkVertragswerkVar = await checkVertragswerk();
    if (!data.checks.checkVertragswerkVar) {
        showProgress(100);
        return;
    }

    data.checks.checkGeschenkeVar = await checkGeschenke();
    if (!data.checks.checkGeschenkeVar) {
        showProgress(100);
        return;
    }

    data.checks.checkDateiabhaengeVar = await checkDateiabhaenge();
    if (!data.checks.checkDateiabhaengeVar) {
        showProgress(100);
        return;
    }

    data.checks.checkBewertungVar = await checkBewertung();
    if (!data.checks.checkBewertungVar) {
        showProgress(100);
        return;
    }

    console.log('select data und abfragen', data);
    console.log(data);

    if (data.checks.checkAuftragVar && data.checks.checkFertigungsaftragVar && data.checks.checkAnforderungVar && data.checks.checkKontakteVar && data.checks.checkBesucheVar &&
        data.checks.checkHistorieVar && data.checks.checkVertragswerkVar && data.checks.checkGeschenkeVar && data.checks.checkDateiabhaengeVar && data.checks.checkBewertungVar) {
        showProgress(60, 'Aktualisieren die Daten');
        for (let i in data.commands.selectAuftrag.DATA) {
            data.commands.update_Auftrag = await dbAction('update', {
                object_id: data.ids.Auftrag_Formular,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectAuftrag.DATA[i].Eintrag}`, `Mandant_ID = ${data.ids.MandantID}`]
            });
        }
        for (let i in data.commands.selectFertigungsauftrag.DATA) {
            data.commands.updateFertigungsauftrag = await dbAction('update', {
                object_id: data.ids.Laufzettel_DQ,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectFertigungsauftrag.DATA[i].Eintrag}`]
            });
        }
        for (let i in data.commands.selectAnforderungen.DATA) {
            data.commands.update_Anforderungen = await dbAction('update', {
                object_id: data.ids.Anforderungen_tab_DQ,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectAnforderungen.DATA[i].Eintrag}`]
            });
        }
        for (let i in data.commands.selectKontakte.DATA) {
            data.commands.update_Kontakte = await dbAction('update', {
                object_id: data.ids.Email_DQ,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectKontakte.DATA[i].Eintrag}`]
            });
        }
        for (let i in data.commands.selectBesuche.DATA) {
            data.commands.update_Besuche = await dbAction('update', {
                object_id: data.ids.Besuche_DQ,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectBesuche.DATA[i].Eintrag}`]
            });
        }
        for (let i in data.commands.selectHistorie.DATA) {
            data.commands.update_Historie = await dbAction('update', {
                object_id: data.ids.Historie_DQ,
                values: {
                    Daten_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectHistorie.DATA[i].Eintrag}`]
            });
        }
        for (let i in data.commands.selectGeschenke.DATA) {
            data.commands.updateGeschenke = await dbAction('update', {
                object_id: data.ids.KundengeschenklisteHTV_DQ,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectGeschenke.DATA[i].Eintrag}`]
            });
        }

        for (let i in data.commands.selectVertragswerk.DATA) {
            data.commands.updateVertragswerke = await dbAction('update', {
                object_id: data.ids.KundenvertragswerkHTV_DQ,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectVertragswerk.DATA[i].Eintrag}`]
            });
        }

        for (let i in data.commands.selectDateiabhaenge.DATA) {
            data.commands.updateDateiabhaenge = await dbAction('update', {
                object_id: data.ids.Archiv_Kunden_DQ,
                values: {
                    Link_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectDateiabhaenge.DATA[i].Eintrag}`]
            });
        }

        for (let i in data.commands.selectBewertung.DATA) {
            data.commands.updateBewertung = await dbAction('update', {
                object_id: data.ids.Bewertung_DQ,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectBewertung.DATA[i].Eintrag}`]
            });
        }

        data.commands.choice_deleteKunde = await userAction('CHOICE', {
            header: 'Die Daten wurden verschoben, soll dieser Kunde gelöscht werden ?',
            simple_answe: true,
        });

        if (data.commands.choice_deleteKunde.DATA == 1) {
            data.commands.deleteUser = await dbAction('DELETE', {
                object_id: data.ids.Kunde_DB,
                conditions: [`Eintrag = ${data.KundeID}`]
            });

            if (data.commands.deleteUser.STATUS === 1) {
                console.log('after update: ', data);
                showProgress(100, 'Der Kunde wurde erfolgreich gelöscht');
                listReloadHelper();
            } else {
                toast('Fehler beim Löschen dieses Kundes', 'error');
                showProgress(100);
                return;
            }
        } else {
            toast('Die Daten wurden verschoben und dieser Kunde wurde nicht ausgelöscht', 'warning');
            showProgress(100);
        }
        console.log('Macro ends: ', data);
    }