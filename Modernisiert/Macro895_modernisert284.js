let table = $(selektor).DataTable();
let today = new Date();
let current_year = today.getFullYear();
today = today.getDate() + '-' + parseInt(today.getMonth() + 1) + '-' + today.getFullYear();
let args = {};

/**
 *@author: d.nguyen
 *@description: modernisierte Makro aus dem Makro 284
 *@param: data = {?}
 */


data = {...data, 
    macro_id: 895,
    args: {},
    commands: {},
    promises: [],
    object_ids: {
        Auftrag_formular: 7,
        Auftragsmakro_Auftragspositionen_Liste: 13,
        Auftragbestellposliste_liste: 75,
        Anforderungen_tab_Datenquelle: 174,
        Auftragsposition_formular: 16,
        Fertigungsauftrag_formular: 328,
        Passport_formular: 51,
        Passportposition_Datenquelle: 365,
        Arbeitsschritt_Datenquelle: 246,
        Vorgang_Formular: 878,
        Sonderschritte_Datenquelle: 767,
        Auftragsposition_grp_Datenquelle: 239,
        LS_RE_Check: 798,
        Kunden_DB: 921,
        LieferscheinERP_Formular: 25,
        Lieferposition_Datenquelle: 360,
        Laufzettel_Formular: 26,
    }
};

showProgress(10, 'Userdaten werden ermittelt');
data.user_data = await userAction('info', {
    simple_answer: true
});
if (data.user_data.STATUS !== 1) {
    toast(L('NO_USER', 'macromsgs'), 'error');
    showProgress(100, L('ORDER_IN_PROGRESS', 'macromsgs'));
    return;
}

// NEU 11.03.2022 wegen Reklamation PE - Prüfung auf offene Auftragsbestellungen
if (data.hasOwnProperty("Auftrag_ID")) {
    data.args.select_Auftragbestellpos = {
        object_id: data.object_ids.Auftragbestellposliste_liste,
        fields: ['Count(Eintrag) as count_Eintrag'],
        conditions: [`Auftrag_ID = ${data.Auftrag_ID}`,`Eingang = 0`]
    };
    data.commands.select_Auftragbestellpos = await dbAction('select', data.args.select_Auftragbestellpos);  

    if (data.commands.select_Auftragbestellpos.DATA.length > 0) {
        toast('Es gibt noch mindestens eine offene Lieferantenbestellung zu diesem Auftrag. Bitte prüfen, ob der Auftrag wirklich fertig ist!', 'error');
    }

    // NEU ab 09.03.2023: Transferauftragsnummer erscheint jetzt auf dem Passport
    data.args.select_Transfer_ID = {
        object_id: data.object_ids.Auftrag_formular,
        fields: ['Transfer_ID'],
        conditions: [`Eintrag = ${data.Auftrag_ID}`]
    };
    data.commands.select_Transfer_ID = await dbAction('select', data.args.select_Transfer_ID);

    if (data.commands.select_Transfer_ID.DATA) {
        data.args.select_Bezeichnung = {
            object_id: data.object_ids.Auftrag_formular,
            fields: ['Bezeichnung'],
            conditions: [`Eintrag = ${look_transfer.DATA}`] 
            
        };
        data.commands.select_Bezeichnung = await dbAction('select', data.args.select_Bezeichnung); // jshint ignore:line
        data.Transferauftrag = data.commands.select_Bezeichnung.DATA[0].Bezeichung;
    } else {
        data.Transferauftrag = '';
    }

} else {
    data.Transferauftrag = '';
}

if (data.Lz_ID > 0) {
    showProgress(5, 'FA-Daten werden ermittelt');
    data.commands.Open_fag = await dbAction('select', { 
        object_id: data.object_ids.Fertigungsauftrag_formular,
        fields: ['Anzahl', 'Gruppe_ID', 'spaet'],
        condition: `Eintrag = ${data.Lz_ID}`,
        order_by: 'Eintrag'
    });
    data.Bestellmenge = parseInt(data.commands.Open_fag.DATA[0].Anzahl);
    data.Gruppe_ID = parseInt(data.commands.Open_fag.DATA[0].Gruppe_ID);
    if (parseInt(Open_fag.DATA[0].spaet) === 1) {
        toast('Die Lieferung erfolgt lt. Wunschtermin verspätet! Ggf. Wunschtermin korrigieren wegen Kennzahl.', 'warning', {
            displayTime: 0,
            closeIcon: false
        });
        data.Log_entry = logAction({
            object_id: data.object_ids.Fertigungsauftrag_formular,
            text: 'Angebot mit einer Position mit Identnummer ' + ident_no + ' wurde erzeugt! User: ' + data.User.Username,
            data_id: data.Neu_ID
        });
    }
    showProgress(10, 'Passportvorgaben werden verarbeitet');
    if (data.Pport > 0) {
        data.Pp_ID = parseInt(data.Pport);
    } else {
        if (data.Pport === 0) {
            data.args.select_PPort_ok = {
                object_id: 51,
                fields: ['Count(Eintrag) as count_Eintrag'],
                conditions: [`Auftrag_ID = ${data.Lz_ID}`]
            };
            data.commands.select_PPort_ok = await dbAction('select', data.args.select_PPort_ok); 
            if (data.commands.select_PPort_ok.DATA == 1) {
                data.args.select_Passport_ID = {
                    object_id: data.object_ids.Passport_formular,
                    fields: ['Eintrag'],
                    conditions: [`Auftrag_ID = ${data.Lz_ID}`]
                };
                data.commands.select_Passport_ID = await dbAction('select', data.args.select_Passport_ID); // jshint ignore:line
                data.Pp_ID = parseInt(data.commands.select_Passport_ID.DATA[0].Eintrag);
            } else {
                data.Pp_ID = null;
            }
        } else {
            // Passport erzeugen
            showProgress(11, 'Passport wird erzeugt');
            data.args.insert_Passport = {
                object_id: data.object_ids.Passport_formular,
                values: {
                    Menge: data.Bestellmenge,
                    Bearbeiter: user_data.DATA.Username,
                    Passport: data.Transferauftrag,
                    Auftrag_ID: data.Lz_ID
                }
            };
            data.commands.insert_Passport = await dbAction('insert', data.args.insert_Passport);
            data.Pp_ID = data.commands.insert_Passport.DATA;
            showProgress(12, 'Passportschritte werden erzeugt');
            
            data.commands.select_joined_Arbeitsschritt = await dbAction('select', {
                object_id: data.object_ids.Arbeitsschritt_Datenquelle,
                fields: {
                    [data.object_ids.Arbeitsschritt_Datenquelle]: ['Eintrag as ArbeitsschrittEintrag', 'AuftragID'],
                },
                join: [
                    [data.object_ids.Arbeitsschritt_Datenquelle, 'VorgangID', data.object_ids.Vorgang_Formular, 'Eintrag']
                ],
                conditions: {
                    [data.object_ids.Arbeitsschritt_Datenquelle] : [`AuftragID = ${data.Lz_ID}`]
                }
            })

            for (let i = 0; i< data.commands.select_joined_Arbeitsschritt.DATA; i++) {
                data.promies.push(dbAction('insert',{
                        object_id: data.object_ids.Passportposition_Datenquelle,
                        values: {
                            Schritt_ID: data.commands.select_joined_Arbeitsschritt.DATA[i].Eintrag,
                            Passport_ID: data.Pp_ID,
                            Sichtbar: 1
                        }
                    })
                )
            }
            await Promise.all(data.promises);
            console.log('Passport wurde erzeugt', data.promises);
            showProgress(13, 'bei Sonderbehandlung Alternativname setzen');
            data.args.prom_upd_ppos1 = {
                object_id: data.object_ids.Passport_formular,
                join: [
                    [data.object_ids.Sonderschritte_Datenquelle, 'Eintrag', data.object_ids.Passportposition_Datenquelle, 'Schritt_ID']
                ],
                conditions: {
                    [data.object_ids.Passportposition_Datenquelle] : [`Passport_ID = ${data.Pp_ID}`]
                }
            }

            data.commands.prom_upd_ppos1 = dbAction('select', data.args.prom_upd_ppos1);
            showProgress(14, 'bei Test Standardzusatztext setzen');
            data.args.prom_upd_ppos2 = {
                object_id: data.object_ids.Passportposition_Datenquelle,
                join: [
                    [data.object_ids.Passportposition_Datenquelle, 'Schritt_ID', data.object_ids.Arbeitsschritt_Datenquelle, 'Eintrag']
                ],
                conditions: {
                    [data.object_ids.Arbeitsschritt_Datenquelle]: ['Zuweis_ID > 2'],
                    [data.object_ids.Passportposition_Datenquelle]: [`Passport_ID = ${data.Pp_ID}`]
                }
            }
            data.comands.prom_upd_ppos2 = dbAction('select', data.args.prom_upd_ppos2);
            await Promise.all([data.commands.prom_upd_ppos1, data.commands.prom_upd_ppos2]); 
            toast('Es wurde ein Passport erzeugt.', 'info');
        }
    }

    showProgress(18, 'Startbedingungen werden ermittelt');
    // gibt es in der Auslieferungsposition einen Einzelpreis, keinen Bereich Lieferposition und ist sie nicht geliefert -> Start_cond = 1
    data.args.countEintrag_Auftragsposition = {
        object_id: data.object_ids.Auftragsposition_grp_Datenquelle,
        fields: ['Count(Eintrag) as count_Eintrag'],
        conditions: [`Eintrag = ${data.Lz_ID}`, 'Einzelpreis > 0', 'Gruppe_ID <> 26', 'Gebucht = 0']
    };
    data.commands.countEintrag_Auftragsposition = await dbAction('select', data.args.countEintrag_Auftragsposition);
    // ist die Auslieferungsposition und die Versandanschrift geprüft?
    data.args.select_RE_Check = {
        object_id: data.object_ids.LS_RE_Check,
        fields: ['Re_check'],
        conditions: [`Eintrag = ${data.Lz_ID}`]
    };
    data.commands.select_RE_Check = await dbAction(data.args.select_RE_Check);

    // gibt es in der Auslieferungsposition Programmier-Schritte -> Prog > 0
    data.args.count_Arbeitsschritt = {
        object_id: data.object_ids.count_Arbeitsschritt,
        fields: ['Count(Eintrag)'],
        conditions: [` AuftragID = ${data.Lz_ID}`, `Zuweis_ID = 1`]
    };

    data.commands.count_Arbeitsschritt = await dbAction('select', data.args.count_Arbeitsschritt);
    // gibt es weitere Auftragspositionen
    data.args.Count_Auftragspos = {
        object_id: data.object_ids.Auftragsposition_grp_Datenquelle,
        fields: ['Count(Eintrag) as count_Eintrag'],
        conditions: [` Auftrag_ID: = ${data.Auftrag_ID}`, `Gebucht = 0`, `Eintrag != ${data.Lz_ID}`, `Gruppe_ID = 3 Or Gruppe_ID = 4 Or Gruppe_ID = 6 Or Gruppe_ID = 8 Or Gruppe_ID = 25`]
    };
    data.commands.Count_Auftragspos = await dbAction('select', data.args.Count_Auftragspos);
    data.Start_cond = parseInt(data.commands.countEintrag_Auftragsposition.DATA);
    if (parseInt(data.commands.Count_Auftragspos.DATA) === 0 && data.Prog == 1) {
        data.Start_cond = 0;
    }
    if (parseInt(data.commands.Count_Auftragspos.DATA) > 0) {
        data.Autom = 0;
    }
    if (data.Start_cond === 0 && data.Prog === 0 && data.Autom === 0) {
        data.Start_cond = 1;
    }
    // Warnung wegen ungeprüftem Preis und Versandanschrift
    if (parseInt(data.commands.select_RE_Check.DATA) === 0) {
        toast('Hinweis: Der Preis und/oder die Versandanschrift wurden noch nicht geprüft!!!', 'warning');
    }
} else {
    data.Auftrag_ID = $('.form').find("input[name=\'Eintrag\']").val();
    data.Start_cond = 1;
    data.Prog = 0;
    data.Autom = 0;

    // Versuche eindeutigen offenen FA zu erkennen
    data.args.CountEintrag_Fertigungsauftrag = {
        object_id: data.object_ids.Fertigungsauftrag_formular,
        fields: ['Count(Eintrag) as countEintrag_Fertigungsauftrag_formular'],
        conditions: [`Auftrag_ID = ${data.Auftrag_ID}`, `Gebucht = 0`, `Bearbeitet = 1`]
    };
    data.commands.CountEintrag_Fertigungsauftrag = await dbAction('select', data.args.CountEintrag_Fertigungsauftrag);
    if (parseInt(data.commands.CountEintrag_Fertigungsauftrag.DATA) === 1) {
        let find_fag = await dbAction('select', { // jshint ignore:line
            object_id: data.object_ids.Fertigungsauftrag_formular,
            fields: ['Eintrag', 'Anzahl', 'Gruppe_ID'],
            conditions: [`Auftrag_ID = ${data.Auftrag_ID}`, `Gebucht = 0`, `Bearbeitet = 1`],
            order_by: 'Eintrag'
        });
        data.Lz_ID = parseInt(find_fag.DATA[0].Eintrag);
        data.Bestellmenge = parseInt(find_fag.DATA[0].Anzahl);
        data.Gruppe_ID = parseInt(find_fag.DATA[0].Gruppe_ID);
    } else {
        toast('Automatische FA-Erkennung fehlgeschlagen! Ggf. über PP+LS ausliefern.', 'warning');
    }
}

console.log(data);

data.args.Check_Condition_Versand = {
    object_id: data.object_ids.Auftrag_formular,
    fields: ['Dienst'],
    conditions: [`Eintrag = ${data.Auftrag_ID}`]
};
data.commands.Check_Condition_Versand = await dbAction('select', data.args.Check_Condition_Versand);

showProgress(20, 'Lieferscheindaten werden ermittelt');
data.mandant_id = 1;
if (data.Auftrag_ID > 0) {
    data.args.select_Kunde_Im_Auftrag = {
            object_id: data.object_ids.Auftrag_formular,
            fields: ['Kunde_ID'],
            conditions: [`Eintrag = ${data.Auftrag_ID}`]   
        }
    const prom_kunde = promisedDLookup(args);
    data.commands.select_Kunde_Im_Auftrag = await dbAction('select', data.args.select_Kunde_Im_Auftrag); // jshint ignore:line
    data.Kunde_ID = parseInt(data.commands.select_Kunde_Im_Auftrag.DATA);
} else {
    data.Kunde_ID = 3042;
}

data.args.select_KundeStatus = {
    object_id: data.object_ids.Kunden_DB, //273,
    fields: ['Status'],
    conditions: [`Eintrag = ${data.Kunde_ID}`] 
};
data.commands.select_KundeStatus = await dbAction('select', data.args.select_KundeStatus); // jshint ignore:line
if (parseInt(data.commands.select_KundeStatus.DATA) === 1) {
    toast('Bitte beachten: Für diesen Kunden ist Vorkasse angegeben!!!', 'error');
}
data.args.select_maxNummer_LieferscheinERP_Formular = {
    object_id: data.object_ids.LieferscheinERP_Formular,
    fields: ['Max(Nummer) as max_Nummer'],
    conditions: [`Jahr = ${current_year}`, `Mandant_ID = ${data.mandant_id}`]
};
// const prom_neu_num = promisedDLookup(args);
data.commands.select_maxNummer_LieferscheinERP_Formular = await dbAction('select', data.args.select_maxNummer_LieferscheinERP_Formular); // jshint ignore:line
if (data.commands.select_maxNummer_LieferscheinERP_Formular.STATUS === 0) {
    data.Neunummer = 0;
} else {
    if (data.commands.select_maxNummer_LieferscheinERP_Formular.DATA != 1) {
        data.Neunummer = 0;
    } else {
        data.Neunummer = parseInt(data.commands.select_maxNummer_LieferscheinERP_Formular.DATA);
    }
}
showProgress(22, 'Versanddienst aus Kundenforderungen wird ermittelt');
data.args.select_cond_Anforderung = {
    object_id: data.object_ids.Anforderungen_tab_Datenquelle,
    fields: ['Count(Eintrag) as count_Eintrag'],
    condition: [`Kunde_ID = ${data.Kunde_ID}`, ` Thema = 'Versandnummer'`, `Old = 0`]
};
data.commands.select_cond_Anforderung = await dbAction('select', data.args.select_cond_Anforderung);

if (data.Start_cond == 1) {
    showProgress(25, 'Lieferschein wird erzeugt');
    data.args.insert_Lieferschein = {
        object_id: data.object_ids.LieferscheinERP_Formular,
        values: {
            Nummer: data.Neunummer + 1,
            Jahr: current_year,
            Datum: today,
            Auftrag_ID: data.Auftrag_ID,
            Mandant_ID: mandant_id,
        },
    };
    if (data.Auftrag_ID === 0) {
        data.args.insert_Lieferschein.values.Bemerkung = 'reservierte LS-Nummer';
        data.args.insert_Lieferschein.values.Druck = 1;
        data.args.insert_Lieferschein.values.Rechnung = 1;
    }

    data.commands.insert_Lieferschein = await dbAction('insert', data.args.insert_Lieferschein)
    if (data.Auftrag_ID === 0) {
        showProgress(30, 'Leere Lieferposition wird erzeugt');
        data.args.insert_Lieferposition = {
            object_id: data.object_ids.Lieferposition_Datenquelle,
            values: {
                Waehrung_ID: 2,
                Liefer_ID: ins_make_ls.DATA,
                Position: 1,
                Name: 'Artikelname',
                Eingang: 'Artikelname',
                Liefermenge: 1,
                Einheit: 'Stk.',
                Steuersatz: 0,
                Sicht: 1
            },
        };
        data.commands.insert_Lieferposition = await dbAction('insert', data.args.insert_Lieferposition);
        toast('Dieser Lieferschein kann nur über die Versandliste geöffnet werden!', 'info');
    }

    if (data.Auftrag_ID > 0) {
        showProgress(35, 'Anschrift und Versanddaten aus Auftrag werden kopiert');
        data.args.select_Auftragdaten = {}
        data.commands.select_join_Auftrag_Lieferschein = await dbAction('select', {
            object_id: data.object_ids.Arbeitsschritt_Datenquelle,
            fields: {
                [data.object_ids.Auftrag_formular]: ['Eintrag as ArbeitsschrittEintrag', 'AuftragID'],
            },
            join: [
                [data.object_ids.Auftrag_formular, 'Eintrag', data.object_ids.LieferscheinERP_Formular, 'Auftrag_ID']
            ]
        });

        data.promises_update_neu_Lieferschein = [];

        for (let i = 0; i < select_join_Auftrag_Lieferschein.DATA.length; i++) {
            data.promises_update_neu_Lieferschein.push(dbAction('update', {
                object_id: data.object_ids.LieferscheinERP_Formular,
                values: {
                    'Lieferschein.Zeile1': select_join_Auftrag_Lieferschein.DATA[i].RZeile1,
                    'Lieferschein.Zeile2': select_join_Auftrag_Lieferschein.DATA[i].RZeile2,
                    'Lieferschein.Zeile3': select_join_Auftrag_Lieferschein.DATA[i].RZeile3,
                    'Lieferschein.Land': select_join_Auftrag_Lieferschein.DATA[i].RLand,
                    'Lieferschein.Ort': select_join_Auftrag_Lieferschein.DATA[i].ROrt,
                    'Lieferschein.Strasse': select_join_Auftrag_Lieferschein.DATA[i].RStrasse,
                    'Lieferschein.PLZ': select_join_Auftrag_Lieferschein.DATA[i].RPLZ,
                    'Lieferschein.VZeile1': select_join_Auftrag_Lieferschein.DATA[i].Versandname,
                    'Lieferschein.VZeile2': select_join_Auftrag_Lieferschein.DATA[i].Versandname2,
                    'Lieferschein.VZeile3': select_join_Auftrag_Lieferschein.DATA[i].Versandname3,
                    'Lieferschein.VLand': select_join_Auftrag_Lieferschein.DATA[i].Versandland,
                    'Lieferschein.VOrt': select_join_Auftrag_Lieferschein.DATA[i].Versandort,
                    'Lieferschein.VStrasse': select_join_Auftrag_Lieferschein.DATA[i].Versandstrasse,
                    'Lieferschein.VPLZ': select_join_Auftrag_Lieferschein.DATA[i].Versandplz,
                    'Lieferschein.Dienst': select_join_Auftrag_Lieferschein.DATA[i].Dienst,
                    'Lieferschein.Versandnummer': select_join_Auftrag_Lieferschein.DATA[i].Versandnummer,
                    'Lieferschein.UPSNummer2': select_join_Auftrag_Lieferschein.DATA[i].Versandnummer2
                },
                conditions: [`Eintrag = ${data.commands.insert_Lieferschein.DATA}`]
            }))
        };

        await Promise.all(data.promises_update_neu_Lieferschein);
        showProgress(40, 'Lieferbedingung aus Kunde wird kopiert');
        data.args.select_LieferscheinZahlung_Auftrag_INNERJOIN_Lieferschein = {
            object_id: data.object_ids.LieferscheinERP_Formular,
            join: [
                [data.object_ids.Auftrag_formular, 'Eintrag', data.object_ids.LieferscheinERP_Formular, 'Auftrag_ID'],
                [data.object_ids.Auftrag_formular, 'Kunde_ID', data.object_ids.Kunden_DB, 'Eintrag']
            ],
            // from: 'Auftrag INNER JOIN Lieferschein ON Auftrag.Eintrag = Lieferschein.Auftrag_ID INNER JOIN Kunde ON Auftrag.Kunde_ID = Kunde.Eintrag',
            fields: {
                //'Lieferschein.Zahlung': '[Kunde].[Zahlung]'
                [data.object_ids.Kunden_DB]:['Zahlung']
            },
            conditions: {
                [data.object_ids.LieferscheinERP_Formular]: [`Eintrag = ${insert_Lieferschein.DATA}`]
            }
        };
        data.commands.select_LieferscheinZahlung_Auftrag_INNERJOIN_Lieferschein = await dbAction('select', data.args.select_LieferscheinZahlung_Auftrag_INNERJOIN_Lieferschein);
        data.commands.update_Lieferschein_Zahlung = await dbAction('update', {
            object_id: data.object_ids.LieferscheinERP_Formular,
            values: {
                Zahlung: data.commands.select_LieferscheinZahlung_Auftrag_INNERJOIN_Lieferschein.DATA[0].Zahlung
            },
            conditions: 
                [`Eintrag = ${insert_Lieferschein.DATA}`]
        })
        //const prom_upd_lbed = data.commands.update_Lieferschein_Zahlung.DATA;
        console.log('Lieferschein wurde ergänzt', data.commands.insert_Lieferschein);
        

        if (data.Lz_ID > 0) {
            showProgress(45, 'Lieferposition aus Laufzettel wird erzeugt');
            data.commands.select_Laufzettel = await dbAction('select', {
                object_id: data.object_ids.Laufzettel_Formular,
                fields: ['Position', 'Lieferartikel', 'Hersteller_ID', 'Einheit', 'Einzelpreis', 'Rabatt', 'Waehrung_ID', 'Eintrag'],
                conditions: [`Eintrag = ${data.Lz_ID}`]
            });

            data.args.insert_Lieferposition_from_Laufzettel = {
                object_id: data.object_ids.Lieferposition_Datenquelle,
                values: {
                    Position: data.commands.select_Laufzettel.DATA[0].Position,
                    Name: data.commands.select_Laufzettel.DATA[0].Lieferartikel,
                    Hersteller_ID: data.commands.select_Laufzettel.DATA[0].Hersteller_ID,
                    Einheit: data.commands.select_Laufzettel.DATA[0].Einheit,
                    Einzelpreis: data.commands.select_Laufzettel.DATA[0].Einzelpreis,
                    Rabatt: data.commands.select_Laufzettel.DATA[0].Rabatt,
                    Waehrung_ID: data.commands.select_Laufzettel.DATA[0].Waehrung_ID,
                    AuftragPos_ID: data.commands.select_Laufzettel.DATA[0].Eintrag,
                    Liefer_ID: Number(data.commands.insert_Lieferschein.DATA),
                    Passport_ID: (data.Pp_ID ? data.Pp_ID : 0),
                    Sicht: 1      
                }
            }
            data.commands.insert_Lieferposition_from_Laufzettel = await dbAction('insert', data.args.insert_Lieferposition_from_Laufzettel); // jshint ignore:line
            data.LieferPos_ID = data.commands.insert_Lieferposition_from_Laufzettel.DATA[0];
        }
    }
    // Automatik-Check
    if (data.Autom == 1) {
        console.log('Automatik-Prozedur gestartet');
        showProgress(50, 'Alle restlichen offenen Positionen ohne FA-Kennung kopieren');
        data.commands.select_Auftragsposition_form = await dbAction('select', {
            object_id: data.object_ids.Auftragsposition_formular, 
            fields: ['Position', 'Lieferartikel', 'Hersteller_ID', 'Einheit', 'Einzelpreis', 'Rabatt', 'Waehrung_ID', 'Eintrag'],
            conditions: [`Auftrag_ID = ${data.Auftrag_ID}`, 'Gebucht = 0', 'Bearbeitet = 0'], 
        }); 

        data.commands.insert_restpos_Lieferposition = await dbAction('insert', {
            values: {
                Position: data.commands.select_Auftragsposition_form.DATA[0].Position,
                Name: data.commands.select_Auftragsposition_form.DATA[0].Lieferartikel,
                Hersteller_ID: data.commands.select_Auftragsposition_form.DATA[0].Hersteller_ID,
                Einheit:  data.commands.select_Auftragsposition_form.DATA[0].Einheit,
                Einzelpreis: data.commands.select_Auftragsposition_form.DATA[0].Einzelpreis,
                Rabatt: data.commands.select_Auftragsposition_form.DATA[0].Rabatt,
                Waehrung_ID: data.commands.select_Auftragsposition_form.DATA[0].Waehrung_ID,
                AuftragPos_ID: data.commands.select_Auftragsposition_form.DATA[0].Eintrag,
                Liefer_ID: data.commands.insert_Lieferschein.DATA
            },
        });
        data.commands.select_from_Auftragsposition_form = await dbAction('select',{
            object_id: data.object_ids.Auftragsposition_formular,
            fields: ['Position', 'Lieferartikel', 'Hersteller_ID', 'Einheit', 'Einzelpreis', 'Rabatt', 'Waehrung_ID', 'Eintrag'],
            conditions: [`Auftrag_ID = ${data.Auftrag_ID}`, `Gebucht = 0`, 'Bearbeitet = 0']
        }); 

        data.commands.insert_Lieferposition = await dbAction('insert', {
            object_id: data.object_ids.Lieferposition_Datenquelle,
            values: {
                Position: data.commands.select_from_Auftragsposition_form.DATA[0].Position,
                Name: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Lieferartikel,
                Hersteller_ID: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Hersteller_ID,
                Einheit: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Einheit,
                Einzelpreis: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Einzelpreis,
                Rabatt: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Rabatt,
                Waehrung_ID: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Waehrung_ID,
                AuftragPos_ID: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Eintrag,
                Liefer_ID: Number(data.commands.insert_Lieferschein.DATA)
            }
        })


        showProgress(55, 'bei allen Pauschalen die Liefermenge auf 1 setzen');
        data.commands.select_join_Auftragposition_Lieferposition = await dbAction('select', {
            object_id: data.object_ids.Lieferposition_Datenquelle,
            fields: ['Eintrag', 'Einzelpreis'],
            join: [
                [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID']
            ],
            conditions: {
                [data.object_ids.Lieferposition_Datenquelle]:[`Liefer_ID = ${data.commands.insert_Lieferschein.DATA}`],
                [data.object_ids.Auftragsposition_formular]:[`Gruppe_ID = 9`] 
            }
        })
        
        data.commands.update_Lieferposition = await dbAction('update', {
            object_id: data.object_ids.Lieferposition_Datenquelle,
            values: {
                Liefermenge: 1,
                Gesamtpreis: Number(data.commands.select_join_Auftragposition_Lieferposition[i].Einzelpreis)
            }
        })
        data.upd_pau = data.commands.update_Lieferposition.DATA;

        showProgress(60, 'bei allen MMZ/Setup die Liefermenge und die Auftragsliefermenge auf 1 setzen');
        data.commands.select_Einzelpreis = await dbAction('select', {
            object_id: data.object_ids.Lieferposition_Datenquelle,
            fields: ['Liefermenge', 'Einzelpreis'],
            join: [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID'],
            conditions: {
                [data.object_ids.Lieferposition_Datenquelle]:[`Liefer_ID = ${data.commands.insert_Lieferschein.DATA}`],
                [data.object_ids.Auftragsposition_formular]:[`MaxDateCode Like 'Mindermeng%' Or MaxDateCode Like 'Setup%'`]
            }
        });

        data.commands.update_Liefermenge_Einzelpreis = await dbAction('update', {
            object_id: data.object_ids.Lieferposition_Datenquelle,
            values: {
                Liefermenge: 1,
                Gesamtpreis: Number(data.commands.select_Einzelpreis.DATA[0].Gesamtpreis)
            }
        });
        data.commands.select_join_Auftragsposition_Lieferposition = await dbAction('select',{
            object_id: data.object_ids.Auftragsmakro_Auftragspositionen_Liste,
            fields: ['Eintrag'],
            join: [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID'],
            conditions: {
                [data.object_ids.Lieferposition_Datenquelle]:[`Liefer_ID = ${data.commands.insert_Lieferschein.DATA}`],
                [data.object_ids.Auftragsposition_formular]:[`MaxDateCode Like 'Mindermeng%' Or MaxDateCode Like 'Setup%'`]
            }   
        })
        if (data.Prog == 1) {
            // NEU 26.01.2023: Nur bei der soeben angelegten Lieferpos. die Liefermenge setzen !!!
            showProgress(65, 'bei Lieferpositionen mit passendem Passport die Liefermenge setzen');
            data.args.select_join_Liefermenge_Gesamtpreis = {
                object_id: data.object_ids.Lieferposition_Datenquelle,
                fields: ['Liefermenge', 'Gesamtpreis'],
                join: [
                    [data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID', data.object_ids.Auftragsposition_formular, 'Eintrag'],
                    [data.object_ids.Passport_formular, 'Auftrag_ID', data.object_ids.Auftragsposition_formular, 'Eintrag']
                ],
                conditions: {
                    [data.object_ids.Auftragsposition_formular]:[`Eintrag = ${data.Lz_ID}`],
                    [data.object_ids.Auftragsposition_formular]:[`Liefermenge = 0`],
                    [data.object_ids.Auftragsposition_formular]:[`Gebucht = 0`],
                    [data.object_ids.Passport_formular]:[`Geliefert = ${0}`],
                    [data.object_ids.Lieferposition_Datenquelle]:['Uebertragen = 0'],
                    [data.object_ids.Lieferposition_Datenquelle]:[`Eintrag = ${data.LieferPos_ID}`],
                }
            }
            data.commands.select_Liefermenge_Gesamtpreis = await dbAction('select', data.args.select_join_Liefermenge_Gesamtpreis);
            data.commands.select_Passport_Menge = await dbAction('select', {
                object_id: data.object_ids.Passport_formular,
                fields: ['Menge'],
                conditions: ['Geliefert = 0']
            });

            data.commands.select_Auftragsposition_Anzahl = await dbAction('select', {
                object_id: data.object_ids.Auftragsposition_formular,
                fields: ['Anzahl'],
                conditions: [`Eintrag = ${data.Lz_ID}`, 'Liefermenge = 0', 'Gebucht = 0']
            });

            data.commands.select_Passport_Menge = await dbAction('select', {
                object_ids: Passport_formular,
                fields: ['Menge'],
                conditions: ['Geliefert = 0']
            })

            data.commands.select_innerjoin_Lieferposition_Auftragpositions_Anzahl = await dbAction('select', {
                object_id: data.object_ids.Auftragsmakro_Auftragspositionen_Liste,
                fields: ['Anzahl'],
                join: [
                    [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID'],
                    [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Passport_formular, 'Auftrag_ID']
                ],
                conditions: {
                    [data.object_ids.Auftragsposition_formular]:[`Eintrag = ${data.Lz_ID}`, 'Liefermenge = 0', 'Gebucht = 0'],
                    [data.object_ids.Passport_formular]:[`Geliefert = 0`],
                    [data.object_ids.Lieferposition_Datenquelle]:['Uebertragen = 0', `Eintrag = ${data.LieferPos_ID}`],
                    [data.object_ids.Auftragsposition_formular]:[`Anzahl = ${data.commands.select_Passport_Menge.DATA[0].Menge}`]
                }
            });

            data.commands.update_joined_Lieferposition_Auftragsposition = await dbAction('update', {
                object_id: data.object_ids.Auftragsmakro_Auftragspositionen_Liste,
                values: {
                    Liefermenge: data.commands.select_innerjoin_Lieferposition_Auftragpositions_Anzahl.DATA[0].Anzahl,
                    Gebucht: 1
                }         
            })
            data.commands.select_Auftragsposition_Anzahl_INNERJOIN_Lieferposistion = await dbAction('select', {
                object_id: data.object_ids.Auftragsposition_formular,
                fields: [`Anzahl`],
                join: [
                    [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID'],
                    [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Passport_formular, 'Auftrag_ID']
                ],
                conditions: {
                    [data.object_ids.Passport_formular]:['Geliefert = 0'],
                    [data.object_ids.Auftragsposition_formular]:[`Eintrag = ${data.Lz_ID}`,`Liefermenge = 0`, 'Gebucht = 0'],
                    [data.object_ids.Passport_formular]:['Geliefert = 0'],
                    [data.object_ids.Lieferposition_Datenquelle]:[`Uebertragen = 0`, `Eintrag = ${data.LieferPos_ID}`],
                }
            })

            data.commands.update_Passport_Geliefert = await dbAction('UPDATE', {
                object_id: data.object_ids.Passport_formular,
                values: {
                    Geliefert: 1
                },
                conditions: [`Menge = ${data.commands.select_Auftragsposition_Anzahl_INNERJOIN_Lieferposistion.DATA[0].Anzahl}`]
            })

        } else {
            // NEU 26.01.2023: Nur bei der soeben angelegten Lieferpos. die Liefermenge setzen !!!
            showProgress(66, 'nur bei der Lieferposition zum Laufzettel die Liefermenge setzen');
            data.commands.select_INNERJOIN_Auftragsposition_Anzahl_Einzelpreis_Rabatt_join_Lieferpostion = await dbAction('SELECT',{
                object_id: data.object_ids.Auftragsposition_formular,
                fields: ['Anzahl', 'Einzelpreis', 'Liefermenge', 'Rabatt'],
                join: [
                    [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID']
                ],
                conditions: {
                    [data.object_ids.Auftragsposition_formular]:[`Eintrag = ${data.Lz_ID}`],
                    [data.object_ids.Lieferposition_Datenquelle]:[`Liefer_ID = ${data.commands.insert_Lieferschein}`, `Eintrag = ${data.LieferPos_ID}`],
                }
            });

            data.commands.update_Lieferposition_Liefermenge_Gesamtpreis = await dbAction('UPDATE', {
                object_id: data.object_ids.Lieferposition_Datenquelle,
                values: {
                    Liefermenge: data.commands.select_INNERJOIN_Auftragsposition_Anzahl_Einzelpreis_Rabatt_join_Lieferpostion.DATA[0].Anzahl - data.commands.select_INNERJOIN_Auftragsposition_Anzahl_Einzelpreis_Rabatt_join_Lieferpostion.DATA[0].Liefermenge,
                    Gesamtpreis: data.commands.select_INNERJOIN_Auftragsposition_Anzahl_Einzelpreis_Rabatt_join_Lieferpostion.DATA[0].Anzahl * data.commands.select_INNERJOIN_Auftragsposition_Anzahl_Einzelpreis_Rabatt_join_Lieferpostion.DATA[0].Einzelpreis * (1-parseFloat(data.commands.select_INNERJOIN_Auftragsposition_Anzahl_Einzelpreis_Rabatt_join_Lieferpostion.DATA[0].Rabatt)) 
                },
                conditions: [`Eintrag = ${data.LieferPos_ID}`, `Liefer_ID = ${data.commands.insert_Lieferschein}`]
            });
            data.commands.select_INNERJOIN_Anzahl_Auftragsposition = await dbAction('SELECT', {
                object_id: Auftragsposition_formular, 
                fields: ['Anzahl'],
                join: [
                    [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID']
                ],
                conditions: {
                    [data.object_ids.Auftragsposition_formular]:[`Eintrag = ${data.Lz_ID}`],
                    [data.object_ids.Lieferposition_Datenquelle]:[`Liefer_ID = ${data.commands.insert_Lieferschein.DATA}`, `Eintrag = ${data.LieferPos_ID}`]
                }
            });
            data.commands.update_Liefermenge_Gebuch_In_Auftragsposition = await dbAcion('SELECT', {
                object_id: data.object_ids.Auftragsmakro_Auftragspositionen_Liste,
                values: {
                    Liefermenge: data.commands.select_INNERJOIN_Anzahl_Auftragsposition.DATA[0].Anzahl,
                    Gebucht: 1
                },
                conditions: [`Eintrag = ${data.Lz_ID}`]
            })
        }
    } else {
        if (data.Auftrag_ID > 0) {
            showProgress(51, 'Alle restlichen offenen Positionen kopieren');
            data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition = await dbAction('select',{
                object_id: data.object_ids.Auftragsposition_formular,
                fields: ['Position', 'Lieferartikel', 'Hersteller_ID', 'Einheit', 'Einzelpreis', 'Rabatt', 'Waehrung_ID', 'Eintrag', 'Bearbeitet'],
                conditions: [`Auftrag_ID = ${data.Auftrag_ID}`, `Gebucht = 0`, `Eintrag <> ${data.Lz_ID}`]
            }); 
    
            data.commands.insert_Lieferposition = await dbAction('insert', {
                object_id: data.object_ids.Lieferposition_Datenquelle,
                values: {
                    Position: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Position,
                    Name: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Lieferartikel,
                    Hersteller_ID: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Hersteller_ID,
                    Einheit: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Einheit,
                    Einzelpreis: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Einzelpreis,
                    Rabatt: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Rabatt,
                    Waehrung_ID: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Waehrung_ID,
                    AuftragPos_ID: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Eintrag,
                    Liefer_ID: data.commands.insert_Lieferschein.DATA,
                    Sicht: data.commands.select_from_Auftragsposition_form_toInsert_Lieferposition.DATA[0].Bearbeiter
                }
            })
            showProgress(56, 'bei allen Pauschalen die Liefermenge auf 1 setzen');
            data.commands.select_INNERJOIN_Einzelpreis = await dbAcion('SELECT', {
                object_id: data.object_ids.Lieferposition_Datenquelle, 
                fields: ['Einzelpreis'],
                join: [
                    [data.object_ids.Auftragsposition_formular, 'Eintrag', data.object_ids.Lieferposition_Datenquelle, 'AuftragPos_ID']
                ],
                conditions: {
                    [data.object_ids.Lieferposition_Datenquelle]:[`Liefer_ID =${data.commands.insert_Lieferschein.DATA}`],
                    [data.object_ids.Auftragsposition_formular]:[`Gruppe_ID = 9`]
                }
            });

            data.commands.update_Liefermenge_Gesamtpreis = await dbAcion('UPDATE', {
                object_id: data.object_ids.Lieferposition_Datenquelle,
                values: {
                    Liefermenge: 1,
                    Gesamtpreis: select_INNERJOIN_Einzelpreis
                },
                conditions: [`Liefer_ID = ${Number(data.commands.insert_Lieferschein.DATA)}`]
            })
            
            toast('Bitte erzeugten Lieferschein noch die Liefermengen übertragen!!!', 'warning', {
                displayTime: 0,
                closeIcon: false
            });
        }
    }
    // gibt es keine Kundenversandnummer im Auftrag
    if (data.commands.Check_Condition_Versand.STATUS !== 1) {
        console.log('Versanddienst über Kufo');
        if (look_cond_anford.DATA == 1) {
            showProgress(58, 'Versanddienst aus Kundenforderungen wird verarbeitet');
            data.commands.select_Anforderung = await dbAction('select', {
                object_id: data.object_ids.Anforderungen_tab_Datenquelle,
                fields: ['Anforderung'],
                conditions: [`Kunde:ID = ${data.Kunde_ID}`, `Thema = 'Versandnummer'`, `Old = 0`]
            });

            let dienst =  data.commands.select_Anforderung.DATA[0].Anforderung.split(":");
            data.commands.update_UDP_Dienst = await dbAcion('UPDATE', {
                object_id: data.object_ids.LieferscheinERP_Formular,
                values: {
                    Dienst: dienst[0],
                    Versandnummer: dienst[1]
                },
                conditions: [`Eintrag = ${data.commands.insert_Lieferschein.DATA}`]
            })
        }
    }

    //writeLog(25, 'Lieferscheinparameter = Neustatus: ' + data.Neustatus + '; From_FA: ' + data.From_FA + '; Gruppe_ID: ' + data.Gruppe_ID + '; FAG-ID: ' + data.Lz_ID, ins_make_ls.DATA);
    logAction({
        object_id: 25, 
        text: 'Lieferscheinparameter = Neustatus: ' + data.Neustatus + '; From_FA: ' + data.From_FA + '; Gruppe_ID: ' + data.Gruppe_ID + '; FAG-ID: ' + data.Lz_ID, 
        data_id: data.commands.insert_Lieferschein.DATA
    })

    let umstell = 10;
    if (data.Neustatus == 1) {
        if (data.From_FA == 1) {
            $('.form').find("input[name=\'Status\']").parent('div').dropdown('set value', 8).dropdown('set text', 'Erledigt im Labor');
            data.args.update_Status_Auftragsposition_grp_Datenquelle = {
                object_id: data.object_ids.Auftragsposition_grp_Datenquelle,
                values: {
                    Status: 8
                },
                conditions: [`Eintrag = ${data.Lz_ID}`]
            }
            umstell = 8;
        } else {
            data.args.update_Status_Auftragsposition_grp_Datenquelle = {
                object_id: data.object_ids.Auftragsposition_grp_Datenquelle,
                values: {
                    Status: 10
                },
                conditions: [`Eintrag = ${data.Lz_ID}`]
            }
            umstell = 10;
        }
        await dbAction('UPDATE', data.args.update_Status_Auftragsposition_grp_Datenquelle);
        toast('Der FA-Status wurde umgestellt!', 'info');
    } else {
        if (data.Neustatus == 2) {
            data.args.update_Status_Auftragsposition_grp_Datenquelle = {
                object_id: data.object_ids.Auftragsposition_grp_Datenquelle,
                values: {
                    Status: 12
                },
                conditions: [`Eintrag = ${data.Lz_ID}`]
            }
            umstell = 12;
            await dbAction('update', data.args.update_Status_Auftragsposition_grp_Datenquelle)
            toast('Der FA-Status wurde umgestellt!', 'info');
        } else {
            if (data.Gruppe_ID == 35) {
                data.args.update_Status_Auftragsposition_grp_Datenquelle = {
                    object_id: data.object_ids.Auftragsposition_grp_Datenquelle,
                    values: {
                        Status: 10
                    },
                    conditions: [`Eintrag = ${data.Lz_ID}`]
                }
                umstell = 10;
                await dbAction('update', data.args.update_Status_Auftragsposition_grp_Datenquelle)
                toast('Der FA-Status wurde ERLEDIGT IN ABWICKLUNG umgestellt! (wegen Bereich Freigabemuster)', 'warning', {
                    delay: 0
                });
            }
        }
    }

    //writeLog(328, 'FA Status umgestellt auf: ' + umstell, data.Lz_ID);
    logAction({
        object_id: 328,
        text: 'FA Status umgestellt auf: ' + umstell,
        data_id: data.Lz_ID
    })
    data.commands.select_count_Eintrag_Auftragsposition_formular = await dbAcion('select', {
        object_id: data.object_ids.Auftragsposition_formular,
        fields: ['Count(Eintrag) as count_Eintrag'],
        conditions: [`Auftrag_ID = ${data.Auftrag_ID}`, 'Gebucht = 0', 'Grupper_ID <> 9']
    })
    if (parseInt(data.commands.select_count_Eintrag_Auftragsposition_formular.DATA) === 0) {
        data.commands.update_Erledigt_Auftragformular = await dbAcion('update', {
            object_id: data.object_ids.Auftrag_formular,
            values: {
                Erledigt: 1
            },
            conditions: [`Eintrag =${data.Auftrag_ID}`]
    });
        logAction({
            object_id: data.object_ids.Auftrag_formular,
            text: 'Auftrag wurde erledigt, weil ' + data.commands.select_count_Eintrag_Auftragsposition_formular.DATA + ' Positionen offen waren!',
            data_id: data.Auftrag_ID
        })
        toast('Auftrag wurde erledigt.', 'info');

    } else {
        logAction({
            object_id: data.object_ids.Auftrag_formular,
            text: 'Auftrag wurde nicht erledigt, weil ' + data.commands.select_count_Eintrag_Auftragsposition_formular.DATA + ' Positionen offen waren!',
            data_id: data.Auftrag_ID
        })
        toast('Auftrag wurde nicht erledigt.', 'info');
    }

    logAction({
        object_id: data.object_ids.LieferscheinERP_Formular,
        text: 'Auftrag wurde nicht erledigt, weil ' + look_adata.commands.select_count_Eintrag_Auftragsposition_formularu_erl.DATA + ' Positionen offen waren!',
        data_id: data.Auftrag_ID
    })

    showProgress(100, L('ORDER_IN_PROGRESS', 'macromsgs'));
    listReloadHelper();
    if (data.Autom == 1) {
        data.report_filename = 'Lieferschein';
        data.Sprache = 0;
        data.Report_ID = (data.Sprache === 0 ? 22 : 363);

        const p_report = promisedCreateReport({
            object_id: data.Report_ID,
            data_id: data.commands.insert_Lieferschein.DATA,
            file_name: data.report_filename + (data.Sprache === 0 ? '' : '_en'),
            file_ext: 'tex',
            output_file_name: 'HTV ' + data.commands.insert_Lieferschein.DATA,
            output_format: 'pdf'
        });

        const no_report = L('NO_REPORT', 'macromsgs');
        data.Report = await p_report; // jshint ignore:line
        if (!data.Report.DATA) {
            toast(no_report, 'error');
            //writeLog(data.object_ids.LieferscheinERP_Formular, 'Lieferscheinausdruck konnte nicht erstellt werden: ' + JSON.stringify(data.Report), data.commands.insert_Lieferschein.DATA);
            logAction({
                object_id: data.object_ids.LieferscheinERP_Formular,
                text: 'Lieferscheinausdruck konnte nicht erstellt werden: ' + JSON.stringify(data.Report),
                data_id: data.commands.insert_Lieferschein.DATA
            });
        } else {
            window.open(data.Report.file_path.replace('var/www/html/', ''));
        }
    } else {
        openForm({
            "Object_ID": data.object_ids.LieferscheinERP_Formular,
            "Data_ID": data.commands.insert_Lieferschein.DATA,
            "tab": 1
        });
    }

} else {
    toast('Die PP+LS-Optionen sind nicht zulässig. Probieren Sie andere Optionen!', 'error', {
        displayTime: 0,
        closeIcon: false
    });
    //writeLog(data.object_idsFertigungsauftrag_formular, 'Verspätete Lieferung bei FAG', data.Lz_ID);
    logAction({
        object_id: data.object_idsFertigungsauftrag_formular,
        text: 'Verspätete Lieferung bei FAG',
        data_id: data.Lz_ID
    })
    showProgress(100, L('ORDER_IN_PROGRESS', 'macromsgs'));
    return;
}