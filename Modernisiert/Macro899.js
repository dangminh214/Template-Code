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

data.KundeID = Number((new URLSearchParams(window.location.href)).get('data_id'));
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

data.commands.select_Auftrag_von_Kunde = await dbAction('select', {
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
    conditions: [`AKunde_ID =  ${data.KundeID}`]
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

data.commands.selectBewertung = await dbAction('select', {
    object_id: data.ids.Bewertung_DQ,
    fields: ['Eintrag'],
    conditions: [`Kunde_ID =  ${data.KundeID}`]
});



async function checkAuftrag() {
    if (data.commands.select_Auftrag_von_Kunde.DATA.length <= 0) {
        toast('Diese Kunde hat keine Aufträge');
        return true;
    } else {
        data.choice_verschiebenAuftrag = await userAction('choice', {
            header: 'Wollen Sie Fertigungsauftrag verschieben',
            simple_answe: true,
        });

        if (data.choice_verschiebenAuftrag) {
            return true;
        }
        else return;
    }
}

async function checkFertigungsauftrag() {
    if (data.commands.selectFertigungsauftrag.DATA.length <= 0) {
        toast('Diese Kunde hat keine Fertigungsaufträge');
        return true;
    } else {
        data.choice_verschiebenFertigungsauftrag = await userAction('choice', {
            header: 'Wollen Sie Fertigungsaufträge verschieben',
            simple_answe: true,
        });
        if (data.choice_verschiebenFertigungsauftrag) {
            return true;
        }
        else return false;
    }    
}

async function checkAnforderung() {
    if (data.commands.selectAnforderungen.DATA.length <= 0) {
        toast('Diese Kunde hat keine Anforderungen');
        return true;
    } else {
        data.choice_verschiebenDaten = await userAction('choice', {
            header: 'Wollen Sie Anforderungen verschieben',
            simple_answe: true,
        });
        if (data.choice_verschiebenDaten) {
            return true;
        }
        else return false;
    }
}

async function checkKontakte() {
    data.commands.selectKontakte = await dbAction('select', {
        object_id: data.ids.Kunde_Kontakte_Liste,
        fields: ['Eintrag'],
        conditions: [`Kunde_ID =  ${data.KundeID}`]
    });
    
    if (data.commands.selectKontakte.DATA.length <= 0) {
        toast('Diese Kunde hat keine Kontakte');
        return true;
    } else {
        data.choice_verschiebenKontakte = await userAction('choice', {
            header: 'Wollen Sie Kontakte verschieben',
            simple_answe: true,
        });
        if (data.choice_verschiebenKontakte) {
            return true;
        }
        else return false;
    }
}

async function checkBesuche() {    
    if (data.commands.selectBesuche.DATA.length <= 0) {
        toast('Diese Kunde hat keine Besuche');
        return true;
    } else {
        data.choice_verschiebenBesuche = await userAction('choice', {
            header: 'Wollen Sie Besuche von diesem Kunde verschieben',
            simple_answe: true,
        });
        if (data.choice_verschiebenBesuche) {
            return true;
        }
        else return false;
    }
}

async function checkHistorie() {
    if (data.commands.selectHistorie.DATA.length <= 0) {
        toast('Diese Kunde hat keine Historie');
        return true;
    } else {
        data.choice_verschiebenDaten = await userAction('choice', {
            header: 'Wollen Sie Historie von diesem Kunde verschieben',
            simple_answe: true,
        });
        if (data.choice_verschiebenDaten) {
            return true;
        }
        else return false;
    }
}

async function checkGeschenke() {
    if (data.commands.selectGeschenke.DATA.length <= 0) {
        toast('Diese Kunde hat keine Geschenke');
        return true;
    } else {
        data.choice_verschiebenDaten = await userAction('choice', {
            header: 'Wollen Sie die Geschenke von diesem Kunde verschieben',
            simple_answe: true,
        });
        if (data.choice_verschiebenDaten) {
            return true;
        }
        else return false;
    }
}

async function checkBewertung() {
    if (data.commands.selectDateiabhaenge.DATA.length <= 0) {
        toast('Diese Kunde hat keine Bewertung');
        return true;
    } else {
        data.choice_verschiebenDaten = await userAction('choice', {
            header: 'Wollen Sie die Bewertungen von diesem Kunde verschieben',
            simple_answe: true,
        });
        if (data.choice_verschiebenDaten) {
            return true;
        }
        else return false;
    }
}

let bedingung = false;
if (checkAuftrag()) {
    if (checkFertigungsauftrag()) {
        if (checkAnforderung()) {
            if (checkAnforderung()) {
                if (checkKontakte()) {
                    if (checkBesuche()) {
                        if (checkHistorie()) {
                            if (checkGeschenke()) {
                                if (checkBewertung()) {
                                    bedingung = true;
                                }
                                else return;
                            }
                            else return;
                        }
                        else return;
                    }
                    else return;
                }
                else return;
            }
            else return;
        }
        else return
    }
    else return 
} 
else return;

if (bedingung === true) {
    for (let i in data.commands.select_Auftrag_von_Kunde.DATA) {
        data.commands.update_Auftrag = await dbAction('update', {
            object_id: data.ids.Auftrag_Formular,
            values: {
                Kunde_ID: data.neuKundeID
            },
            conditions: [`Eintrag = ${data.commands.select_Auftrag_von_Kunde.DATA[i].Eintrag}`, `Mandant_ID = ${data.MandantID}`]
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
                AKunde_ID: data.neuKundeID
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
    for (let i in data.commands.selectDateiabhaenge.DATA) {
        data.commands.updateDateiabhaenge = await dbAction('update', {
            object_id: data.ids.Bewertung_DQ,
            values: {
                Kunde_ID: data.neuKundeID
            },
            conditions: [`Eintrag = ${data.commands.selectBewertung.DATA[i].Eintrag}`]
        });
    }
    
}




