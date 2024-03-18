let table = $(selektor).DataTable();
let today = new Date();
let current_year = today.getFullYear();
today = today.getDate() + '-' + parseInt(today.getMonth() + 1) + '-' + today.getFullYear();
let args = {};

showProgress(10, 'Userdaten werden ermittelt');
const prom_user = promisedGetUserData();
let user_data = await prom_user; // jshint ignore:line
if (user_data.STATUS === 0) {
    toast(L('NO_USER', 'macromsgs'), 'error');
    showProgress(100, L('ORDER_IN_PROGRESS', 'macromsgs'));
    return;
}

// NEU 11.03.2022 wegen Reklamation PE - Prüfung auf offene Auftragsbestellungen
if (data.hasOwnProperty("Auftrag_ID")) {
    args = {
        object_id: 75,
        field_name: 'Count(Eintrag)',
        condition: {
            Auftrag_ID: data.Auftrag_ID,
            Eingang: 0
        }
    };
    const prom_bestell = promisedDLookup(args);
    let look_bestell = await prom_bestell; // jshint ignore:line
    if (parseInt(look_bestell.DATA) > 0) {
        toast('Es gibt noch mindestens eine offene Lieferantenbestellung zu diesem Auftrag. Bitte prüfen, ob der Auftrag wirklich fertig ist!', 'error');
    }

    // NEU ab 09.03.2023: Transferauftragsnummer erscheint jetzt auf dem Passport
    args = {
        object_id: 7,
        field_name: 'Transfer_ID',
        condition: {
            Eintrag: data.Auftrag_ID
        }
    };
    const prom_transfer = promisedDLookup(args);
    let look_transfer = await prom_transfer; // jshint ignore:line
    if (look_transfer.DATA) {
        args = {
            object_id: 7,
            field_name: 'Bezeichnung',
            condition: {
                Eintrag: look_transfer.DATA
            }
        };
        const prom_htvc = promisedDLookup(args);
        let look_htvc = await prom_htvc; // jshint ignore:line
        data.Transferauftrag = look_htvc.DATA;
    } else {
        data.Transferauftrag = '';
    }

} else {
    data.Transferauftrag = '';
}

if (data.Lz_ID > 0) {
    showProgress(5, 'FA-Daten werden ermittelt');
    let Open_fag = await promisedOpenRecordset({ // jshint ignore:line
        object_id: 328,
        field_name: ['Anzahl', 'Gruppe_ID', 'spaet'],
        condition: {
            Eintrag: data.Lz_ID
        },
        order_by: 'Eintrag'
    });
    data.Bestellmenge = parseInt(Open_fag.DATA[0].Anzahl);
    data.Gruppe_ID = parseInt(Open_fag.DATA[0].Gruppe_ID);
    if (parseInt(Open_fag.DATA[0].spaet) === 1) {
        toast('Die Lieferung erfolgt lt. Wunschtermin verspätet! Ggf. Wunschtermin korrigieren wegen Kennzahl.', 'warning', {
            displayTime: 0,
            closeIcon: false
        });
        writeLog(328, 'Verspätete Lieferung bei FAG', data.Lz_ID);
    }
    showProgress(10, 'Passportvorgaben werden verarbeitet');
    if (data.Pport > 0) {
        data.Pp_ID = parseInt(data.Pport);
    } else {
        if (data.Pport === 0) {
            args = {
                object_id: 51,
                field_name: 'Count(Eintrag)',
                condition: {
                    Auftrag_ID: data.Lz_ID
                }
            };
            const prom_pport_ok = promisedDLookup(args);
            let look_pport_ok = await prom_pport_ok; // jshint ignore:line
            if (look_pport_ok.DATA == 1) {
                args = {
                    object_id: 51,
                    field_name: 'Eintrag',
                    condition: {
                        Auftrag_ID: data.Lz_ID
                    }
                };
                const prom_pport_id = promisedDLookup(args);
                let look_pport_id = await prom_pport_id; // jshint ignore:line
                data.Pp_ID = look_pport_id.DATA;
            } else {
                data.Pp_ID = null;
            }
        } else {
            // Passport erzeugen
            showProgress(11, 'Passport wird erzeugt');
            args = {
                object_id: 51,
                values: {
                    Menge: data.Bestellmenge,
                    Bearbeiter: user_data.DATA['Username'],
                    Passport: data.Transferauftrag,
                    Auftrag_ID: data.Lz_ID
                }
            };
            const prom_make_pp = promisedInsertInto(args);
            let ins_make_pp = await prom_make_pp; // jshint ignore:line
            data.Pp_ID = ins_make_pp.DATA;
            showProgress(12, 'Passportschritte werden erzeugt');
            args = {
                object_id: 365,
                from: 'Vorgang INNER JOIN Arbeitsschritt ON Vorgang.Eintrag = Arbeitsschritt.VorgangID',
                values: {
                    Schritt_ID: '%Arbeitsschritt.Eintrag',
                    Passport_ID: data.Pp_ID,
                    Sichtbar: 1
                },
                condition: {
                    'Arbeitsschritt.AuftragID': data.Lz_ID
                },
                condition_text: "AblaufID <> 100 And AblaufID <> 190 And AblaufID <> 196 And Vorgang.Name Not Like 'Bauteillageprüf%' And Vorgang.Name Not Like 'Externe Bearbeitung%'"
            };
            const prom_make_ppos = promisedInsertInto(args);
            let ins_make_ppos = await prom_make_ppos; // jshint ignore:line
            console.log('Passport wurde erzeugt', ins_make_pp);
            showProgress(13, 'bei Sonderbehandlung Alternativname setzen');
            args = {
                object_id: 365,
                from: 'Sonderschritte INNER JOIN PassportPos ON Sonderschritte.Eintrag = PassportPos.Schritt_ID',
                select: {
                    'PassportPos.Bemerkung': '[Sonderschritte].[Bezeichnung]'
                },
                condition: {
                    'PassportPos.Passport_ID': data.Pp_ID
                }
            };
            const prom_upd_ppos1 = promisedUpdateRecord(args);
            showProgress(14, 'bei Test Standardzusatztext setzen');
            args = {
                object_id: 365,
                from: 'Arbeitsschritt_form INNER JOIN PassportPos ON Arbeitsschritt_form.Eintrag = PassportPos.Schritt_ID',
                values: {
                    'PassportPos.Bemerkung': 'lt. Parameterangaben'
                },
                condition: {
                    'Arbeitsschritt_form.Zuweis_ID': 2,
                    'PassportPos.Passport_ID': data.Pp_ID
                }
            };
            const prom_upd_ppos2 = promisedUpdateRecord(args);
            await Promise.all([prom_upd_ppos1, prom_upd_ppos2]); // jshint ignore:line
            toast('Es wurde ein Passport erzeugt.', 'info');
        }
    }

    showProgress(18, 'Startbedingungen werden ermittelt');
    // gibt es in der Auslieferungsposition einen Einzelpreis, keinen Bereich Lieferposition und ist sie nicht geliefert -> Start_cond = 1
    args = {
        object_id: 239,
        field_name: 'Count(Eintrag)',
        condition: {
            Eintrag: data.Lz_ID
        },
        condition_text: 'Einzelpreis > 0 And Gruppe_ID <> 26 And Gebucht = 0'
    };
    const prom_cond_ok = promisedDLookup(args);
    // ist die Auslieferungsposition und die Versandanschrift geprüft?
    args = {
        object_id: 798,
        field_name: 'Re_check',
        condition: {
            Eintrag: data.Lz_ID
        }
    };
    const prom_cond_check = promisedDLookup(args);





    // gibt es in der Auslieferungsposition Programmier-Schritte -> Prog > 0
    args = {
        object_id: 330,
        field_name: 'Count(Eintrag)',
        condition: {
            AuftragID: data.Lz_ID,
            Zuweis_ID: 1
        }
    };
    const prom_cond_prog = promisedDLookup(args);
    // gibt es weitere Auftragspositionen
    args = {
        object_id: 239,
        field_name: 'Count(Eintrag)',
        condition: {
            Auftrag_ID: data.Auftrag_ID
        },
        condition_text: '(Gruppe_ID = 3 Or Gruppe_ID = 4 Or Gruppe_ID = 6 Or Gruppe_ID = 8 Or Gruppe_ID = 25) And Gebucht = 0 And Eintrag <> ' + data.Lz_ID
    };
    const prom_cond_auto = promisedDLookup(args);
    const [look_cond_ok, look_cond_check, look_cond_prog, look_cond_auto] = await Promise.all([prom_cond_ok, prom_cond_check, prom_cond_prog, prom_cond_auto]); // jshint ignore:line
    data.Start_cond = parseInt(look_cond_ok.DATA);
    if (parseInt(look_cond_prog.DATA) === 0 && data.Prog == 1) {
        data.Start_cond = 0;
    }
    if (parseInt(look_cond_auto.DATA) > 0) {
        data.Autom = 0;
    }
    if (data.Start_cond === 0 && data.Prog === 0 && data.Autom === 0) {
        data.Start_cond = 1;
    }
    // Warnung wegen ungeprüftem Preis und Versandanschrift
    if (parseInt(look_cond_check.DATA) === 0) {
        toast('Hinweis: Der Preis und/oder die Versandanschrift wurden noch nicht geprüft!!!', 'warning');
    }
} else {
    if (!data.hasOwnProperty("Auftrag_ID")) {
        data.Auftrag_ID = $('.form').find("input[name=\'Eintrag\']").val();
    }
    data.Start_cond = 1;
    data.Prog = 0;
    data.Autom = 0;

    // Versuche eindeutigen offenen FA zu erkennen
    args = {
        object_id: 328,
        field_name: 'Count(Eintrag)',
        condition: {
            Auftrag_ID: data.Auftrag_ID,
            Gebucht: 0,
            Bearbeitet: 1
        }
    };
    const prom_anz_fag = promisedDLookup(args);
    let anz_fag = await prom_anz_fag; // jshint ignore:line
    if (parseInt(anz_fag.DATA) === 1) {
        let find_fag = await promisedOpenRecordset({ // jshint ignore:line
            object_id: 328,
            field_name: ['Eintrag', 'Anzahl', 'Gruppe_ID'],
            condition: {
                Auftrag_ID: data.Auftrag_ID,
                Gebucht: 0,
                Bearbeitet: 1
            },
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

args = {
    object_id: 7,
    field_name: 'Dienst',
    condition: {
        Eintrag: data.Auftrag_ID
    }
};
const prom_cond_versand = promisedDLookup(args);

showProgress(20, 'Lieferscheindaten werden ermittelt');
const mandant_id = 1;
if (data.Auftrag_ID > 0) {
    args = {
        object_id: 7,
        field_name: 'Kunde_ID',
        condition: {
            Eintrag: data.Auftrag_ID
        }
    };
    const prom_kunde = promisedDLookup(args);
    let look_kunde_id = await prom_kunde; // jshint ignore:line
    data.Kunde_ID = parseInt(look_kunde_id.DATA);
} else {
    data.Kunde_ID = 3042;
}
args = {
    object_id: 921, //273,
    field_name: 'Status',
    condition: {
        Eintrag: data.Kunde_ID
    }
};
const prom_kd_status = promisedDLookup(args);
let look_kd_status = await prom_kd_status; // jshint ignore:line
if (parseInt(look_kd_status.DATA) === 1) {
    toast('Bitte beachten: Für diesen Kunden ist Vorkasse angegeben!!!', 'error');
}
args = {
    object_id: 25,
    field_name: 'Max(Nummer)',
    condition: {
        Jahr: current_year,
        Mandant_ID: mandant_id
    }
};
const prom_neu_num = promisedDLookup(args);
let look_neu_num = await prom_neu_num; // jshint ignore:line
if (look_neu_num.STATUS === 0) {
    data.Neunummer = 0;
} else {
    if (look_neu_num.DATA === false || look_neu_num.DATA === null) {
        data.Neunummer = 0;
    } else {
        data.Neunummer = parseInt(look_neu_num.DATA);
    }
}
showProgress(22, 'Versanddienst aus Kundenforderungen wird ermittelt');
args = {
    object_id: 174,
    field_name: 'Count(Eintrag)',
    condition: {
        Kunde_ID: data.Kunde_ID,
        Thema: 'Versandnummer',
        Old: 0
    }
};
const prom_cond_anford = promisedDLookup(args);

const [look_cond_versand, look_cond_anford] = await Promise.all([prom_cond_versand, prom_cond_anford]); // jshint ignore:line
// console.log('bedingungen', look_cond_ok.DATA);
// console.log('bedingungen', look_cond_prog.DATA);

if (data.Start_cond == 1) {
    showProgress(25, 'Lieferschein wird erzeugt');
    args = {
        object_id: 25,
        values: {
            Nummer: data.Neunummer + 1,
            Jahr: current_year,
            // Jahr: 1992,
            Datum: today,
            Auftrag_ID: data.Auftrag_ID,
            Mandant_ID: mandant_id,
        },
    };
    if (data.Auftrag_ID === 0) {
        args.values.Bemerkung = 'reservierte LS-Nummer';
        args.values.Druck = 1;
        args.values.Rechnung = 1;
    }
    const prom_make_ls = promisedInsertInto(args);
    let ins_make_ls = await prom_make_ls; // jshint ignore:line
    console.log('Lieferschein wurde erzeugt', ins_make_ls);
    if (data.Auftrag_ID === 0) {
        showProgress(30, 'Leere Lieferposition wird erzeugt');
        args = {
            object_id: 360,
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
        const prom_make_lpos = promisedInsertInto(args);
        let ins_make_lpos = await prom_make_lpos; // jshint ignore:line
        toast('Dieser Lieferschein kann nur über die Versandliste geöffnet werden!', 'info');
    }

    if (data.Auftrag_ID > 0) {
        showProgress(35, 'Anschrift und Versanddaten aus Auftrag werden kopiert');
        args = {
            object_id: 25,
            from: 'Auftrag INNER JOIN Lieferschein ON Auftrag.Eintrag = Lieferschein.Auftrag_ID',
            select: {
                'Lieferschein.Zeile1': '[Auftrag].[RZeile1]',
                'Lieferschein.Zeile2': '[Auftrag].[RZeile2]',
                'Lieferschein.Zeile3': '[Auftrag].[RZeile3]',
                'Lieferschein.Land': '[Auftrag].[RLand]',
                'Lieferschein.Ort': '[Auftrag].[ROrt]',
                'Lieferschein.Strasse': '[Auftrag].[RStrasse]',
                'Lieferschein.PLZ': '[Auftrag].[RPLZ]',
                'Lieferschein.VZeile1': '[Auftrag].[Versandname]',
                'Lieferschein.VZeile2': '[Auftrag].[Versandname2]',
                'Lieferschein.VZeile3': '[Auftrag].[Versandname3]',
                'Lieferschein.VLand': '[Auftrag].[Versandland]',
                'Lieferschein.VOrt': '[Auftrag].[Versandort]',
                'Lieferschein.VStrasse': '[Auftrag].[Versandstrasse]',
                'Lieferschein.VPLZ': '[Auftrag].[Versandplz]',
                'Lieferschein.Dienst': '[Auftrag].[Dienst]',
                'Lieferschein.Versandnummer': '[Auftrag].[Versandnummer]',
                'Lieferschein.UPSNummer2': '[Auftrag].[Versandnummer2]'
            },
            condition: {
                'Lieferschein.Eintrag': ins_make_ls.DATA
            }
        };
        const prom_upd_addr = promisedUpdateRecord(args);
        showProgress(40, 'Lieferbedingung aus Kunde wird kopiert');
        args = {
            object_id: 25,
            from: 'Auftrag INNER JOIN Lieferschein ON Auftrag.Eintrag = Lieferschein.Auftrag_ID INNER JOIN Kunde ON Auftrag.Kunde_ID = Kunde.Eintrag',
            select: {
                'Lieferschein.Zahlung': '[Kunde].[Zahlung]'
            },
            condition: {
                'Lieferschein.Eintrag': ins_make_ls.DATA
            }
        };
        const prom_upd_lbed = promisedUpdateRecord(args);
        await Promise.all([prom_upd_addr, prom_upd_lbed]); // jshint ignore:line
        console.log('Lieferschein wurde ergänzt', ins_make_ls);

        if (data.Lz_ID > 0) {
            showProgress(45, 'Lieferposition aus Laufzettel wird erzeugt');
            args = {
                object_id: 360,
                from: 'Laufzettel',
                values: {
                    Position: '%Position',
                    Name: '%Lieferartikel',
                    Hersteller_ID: '%Hersteller_ID',
                    Einheit: '%Einheit',
                    Einzelpreis: '%Einzelpreis',
                    Rabatt: '%Rabatt',
                    Waehrung_ID: '%Waehrung_ID',
                    AuftragPos_ID: '%Eintrag',
                    Liefer_ID: ins_make_ls.DATA,
                    Passport_ID: (data.Pp_ID ? data.Pp_ID : 0),
                    Sicht: 1
                },
                condition: {
                    Eintrag: data.Lz_ID
                }
            };
            const prom_make_liefpos = promisedInsertInto(args);
            let ins_make_liefpos = await prom_make_liefpos; // jshint ignore:line
            data.LieferPos_ID = ins_make_liefpos.DATA[0];
            // toast('LieferPos-ID ' + data.LieferPos_ID, 'info');
        }
    }
    // Automatik-Check
    if (data.Autom == 1) {
        console.log('Automatik-Prozedur gestartet');
        showProgress(50, 'Alle restlichen offenen Positionen ohne FA-Kennung kopieren');
        args = {
            object_id: 360,
            from: 'Auftragsposition_form',
            values: {
                Position: '%Position',
                Name: '%Lieferartikel',
                Hersteller_ID: '%Hersteller_ID',
                Einheit: '%Einheit',
                Einzelpreis: '%Einzelpreis',
                Rabatt: '%Rabatt',
                Waehrung_ID: '%Waehrung_ID',
                AuftragPos_ID: '%Eintrag',
                Liefer_ID: ins_make_ls.DATA
            },
            condition: {
                Auftrag_ID: data.Auftrag_ID,
                Gebucht: 0,
                Bearbeitet: 0
            },
            condition_text: 'Eintrag <> ' + data.Lz_ID
        };
        const prom_make_restpos = promisedInsertInto(args);
        let ins_make_restpos = await prom_make_restpos; // jshint ignore:line
        showProgress(55, 'bei allen Pauschalen die Liefermenge auf 1 setzen');
        args = {
            object_id: 360,
            from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID',
            select: {
                'Lieferposition.Liefermenge': 1,
                'Lieferposition.Gesamtpreis': '[Lieferposition].[Einzelpreis]',
            },
            condition: {
                'Lieferposition.Liefer_ID': ins_make_ls.DATA,
                'Auftragsposition.Gruppe_ID': 9
            }
        };
        const prom_upd_pau = promisedUpdateRecord(args);
        upd_pau = await prom_upd_pau; // jshint ignore:line
        showProgress(60, 'bei allen MMZ/Setup die Liefermenge und die Auftragsliefermenge auf 1 setzen');
        args = {
            object_id: 360,
            from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID',
            select: {
                'Lieferposition.Liefermenge': 1,
                'Lieferposition.Gesamtpreis': '[Lieferposition].[Einzelpreis]'
            },
            condition: {
                'Lieferposition.Liefer_ID': ins_make_ls.DATA
            },
            condition_text: "(Auftragsposition.MaxDateCode Like 'Mindermeng%' Or Auftragsposition.MaxDateCode Like 'Setup%')"
        };
        const prom_upd_minmeng1 = promisedUpdateRecord(args);
        await prom_upd_minmeng1; // jshint ignore:line
        args = {
            object_id: 13,
            from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID',
            values: {
                'Auftragsposition.Liefermenge': 1,
                'Auftragsposition.Gebucht': 1
            },
            condition: {
                'Lieferposition.Liefer_ID': ins_make_ls.DATA
            },
            condition_text: "(Auftragsposition.MaxDateCode Like 'Mindermeng%' Or Auftragsposition.MaxDateCode Like 'Setup%')"
        };
        const prom_upd_minmeng2 = promisedUpdateRecord(args);
        await prom_upd_minmeng2;


        if (data.Prog == 1) {

            // NEU 26.01.2023: Nur bei der soeben angelegten Lieferpos. die Liefermenge setzen !!!
            showProgress(65, 'bei Lieferpositionen mit passendem Passport die Liefermenge setzen');
            args = {
                object_id: 360,
                from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID INNER JOIN Passport ON Passport.Auftrag_ID = Auftragsposition.Eintrag',
                select: {
                    'Lieferposition.Liefermenge': '[Auftragsposition].[Anzahl]',
                    'Lieferposition.Gesamtpreis': '([Auftragsposition].[Anzahl]*[Lieferposition].[Einzelpreis]-([Auftragsposition].[Anzahl]*[Lieferposition].[Einzelpreis]*[Lieferposition].[Rabatt]/100))'
                },
                condition: {
                    'Auftragsposition.Eintrag': data.Lz_ID,
                    'Auftragsposition.Liefermenge': 0,
                    'Auftragsposition.Gebucht': 0,
                    'Passport.Geliefert': 0,
                    'Lieferposition.Uebertragen': 0,
                    'Lieferposition.Eintrag': data.LieferPos_ID
                },
                condition_text: 'Auftragsposition.Anzahl = Passport.Menge'
            };
            const prom_upd_passp1 = promisedUpdateRecord(args);
            await prom_upd_passp1;
            args = {
                object_id: 13,
                from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID INNER JOIN Passport ON Passport.Auftrag_ID = Auftragsposition.Eintrag',
                select: {
                    'Auftragsposition.Liefermenge': '[Auftragsposition].[Anzahl]',
                    'Auftragsposition.Gebucht': 1
                },
                condition: {
                    'Auftragsposition.Eintrag': data.Lz_ID,
                    'Auftragsposition.Liefermenge': 0,
                    'Auftragsposition.Gebucht': 0,
                    'Passport.Geliefert': 0,
                    'Lieferposition.Uebertragen': 0,
                    'Lieferposition.Eintrag': data.LieferPos_ID
                },
                condition_text: 'Auftragsposition.Anzahl = Passport.Menge'
            };
            const prom_upd_passp2 = promisedUpdateRecord(args);
            await prom_upd_passp2;
            args = {
                object_id: 51,
                from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID INNER JOIN Passport ON Passport.Auftrag_ID = Auftragsposition.Eintrag',
                values: {
                    'Passport.Geliefert': 1
                },
                condition: {
                    'Auftragsposition.Eintrag': data.Lz_ID,
                    'Auftragsposition.Liefermenge': 0,
                    'Auftragsposition.Gebucht': 0,
                    'Passport.Geliefert': 0,
                    'Lieferposition.Uebertragen': 0,
                    'Lieferposition.Eintrag': data.LieferPos_ID
                },
                condition_text: 'Auftragsposition.Anzahl = Passport.Menge'
            };
            const prom_upd_passp3 = promisedUpdateRecord(args);
            await prom_upd_passp3;
        } else {

            // NEU 26.01.2023: Nur bei der soeben angelegten Lieferpos. die Liefermenge setzen !!!
            showProgress(66, 'nur bei der Lieferposition zum Laufzettel die Liefermenge setzen');
            args = {
                object_id: 360,
                from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID',
                select: {
                    'Lieferposition.Liefermenge': '[Auftragsposition].[Anzahl]-[Auftragsposition].[Liefermenge]',
                    'Lieferposition.Gesamtpreis': '([Auftragsposition].[Anzahl]*[Auftragsposition].[Einzelpreis]-([Auftragsposition].[Anzahl]*[Auftragsposition].[Einzelpreis]*[Auftragsposition].[Rabatt]/100))'
                },
                condition: {
                    'Auftragsposition.Eintrag': data.Lz_ID,
                    'Lieferposition.Liefer_ID': ins_make_ls.DATA,
                    'Lieferposition.Eintrag': data.LieferPos_ID
                }
            };
            const prom_upd_passp1 = promisedUpdateRecord(args);
            await prom_upd_passp1;
            args = {
                object_id: 13,
                from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID',
                select: {
                    'Auftragsposition.Liefermenge': '[Auftragsposition].[Anzahl]',
                    'Auftragsposition.Gebucht': 1
                },
                condition: {
                    'Auftragsposition.Eintrag': data.Lz_ID,
                    'Lieferposition.Liefer_ID': ins_make_ls.DATA,
                    'Lieferposition.Eintrag': data.LieferPos_ID
                }
            };
            const prom_upd_passp2 = promisedUpdateRecord(args);
            await prom_upd_passp2;
        }
    } else {
        if (data.Auftrag_ID > 0) {
            showProgress(51, 'Alle restlichen offenen Positionen kopieren');
            console.log('keine Automatik-Prozedur möglich');
            args = {
                object_id: 360,
                from: 'Auftragsposition_form',
                values: {
                    Position: '%Position',
                    Name: '%Lieferartikel',
                    Hersteller_ID: '%Hersteller_ID',
                    Einheit: '%Einheit',
                    Einzelpreis: '%Einzelpreis',
                    Rabatt: '%Rabatt',
                    Waehrung_ID: '%Waehrung_ID',
                    AuftragPos_ID: '%Eintrag',
                    Liefer_ID: ins_make_ls.DATA,
                    Sicht: '%Bearbeitet'
                },
                condition: {
                    Auftrag_ID: data.Auftrag_ID,
                    Gebucht: 0
                },
                condition_text: 'Eintrag <> ' + data.Lz_ID
            };
            const prom_make_restpos = promisedInsertInto(args);
            let ins_make_restpos = await prom_make_restpos;
            showProgress(56, 'bei allen Pauschalen die Liefermenge auf 1 setzen');
            args = {
                object_id: 360,
                from: 'Auftragsposition INNER JOIN Lieferposition ON Auftragsposition.Eintrag = Lieferposition.AuftragPos_ID',
                select: {
                    'Lieferposition.Liefermenge': 1,
                    'Lieferposition.Gesamtpreis': '[Lieferposition].[Einzelpreis]',
                },
                condition: {
                    'Lieferposition.Liefer_ID': ins_make_ls.DATA,
                    'Auftragsposition.Gruppe_ID': 9
                }
            };
            const prom_upd_pau = promisedUpdateRecord(args);
            let upd_pau = await prom_upd_pau;
            toast('Bitte erzeugten Lieferschein noch die Liefermengen übertragen!!!', 'warning', {
                displayTime: 0,
                closeIcon: false
            });
        }
    }
    // gibt es keine Kundenversandnummer im Auftrag
    if (look_cond_versand.DATA === null) {
        console.log('Versanddienst über Kufo');
        if (look_cond_anford.DATA == 1) {
            showProgress(58, 'Versanddienst aus Kundenforderungen wird verarbeitet');
            args = {
                object_id: 174,
                field_name: 'Anforderung',
                condition: {
                    Kunde_ID: data.Kunde_ID,
                    Thema: 'Versandnummer',
                    Old: 0
                }
            };
            const prom_cond_vnum = promisedDLookup(args);
            let look_cond_vnum = await prom_cond_vnum;
            let dienst = look_cond_vnum.DATA.split(":");
            args = {
                object_id: 25,
                values: {
                    'Dienst': dienst[0],
                    'Versandnummer': dienst[1],
                },
                condition: {
                    'Eintrag': ins_make_ls.DATA
                }
            };
            const prom_upd_dienst = promisedUpdateRecord(args);
            let upd_dienst = await prom_upd_dienst;



        }
    }

    // FAG erledigen prüfen - deaktiviert 30.04.2019
    /*
            if (data.Neustatus == 1) {
                const promised_choice = promisedChoice({
                    header: "Soll der FA-Status auf ERLEDIGT IN ABW. gestellt werden?"
                });
                data.status_choice = await promised_choice; // jshint ignore:line
                if (data.status_choice === true) {
                    $('.form').find("input[name=\'Status\']").parent('div').dropdown('set value', 10).dropdown('set text', 'Erledigt in Abw. (Passports komplett)');
                    args = {
                        object_id: 239,
                        values: {
                            'Status': 10
                        },
                        condition: {
                            'Eintrag': data.Lz_ID
                        }
                    };
                    await promisedUpdateRecord(args);
                    console.log('Statusabfrage!');
                }
            }
    */

    writeLog(25, 'Lieferscheinparameter = Neustatus: ' + data.Neustatus + '; From_FA: ' + data.From_FA + '; Gruppe_ID: ' + data.Gruppe_ID + '; FAG-ID: ' + data.Lz_ID, ins_make_ls.DATA);

    let umstell = 10;
    if (data.Neustatus == 1) {
        if (data.From_FA == 1) {
            $('.form').find("input[name=\'Status\']").parent('div').dropdown('set value', 8).dropdown('set text', 'Erledigt im Labor');
            args = {
                object_id: 239,
                values: {
                    'Status': 8
                },
                condition: {
                    'Eintrag': data.Lz_ID
                }
            };
            umstell = 8;
        } else {
            args = {
                object_id: 239,
                values: {
                    'Status': 10
                },
                condition: {
                    'Eintrag': data.Lz_ID
                }
            };
        }
        await promisedUpdateRecord(args);
        toast('Der FA-Status wurde umgestellt!', 'info');
    } else {
        if (data.Neustatus == 2) {
            args = {
                object_id: 239,
                values: {
                    'Status': 12
                },
                condition: {
                    'Eintrag': data.Lz_ID
                }
            };
            umstell = 12;
            await promisedUpdateRecord(args);
            toast('Der FA-Status wurde umgestellt!', 'info');
        } else {
            // bei Neustatus == 0 prüfen auf Freigabemuster !!!
            if (data.Gruppe_ID == 35) {
                args = {
                    object_id: 239,
                    values: {
                        'Status': 10
                    },
                    condition: {
                        'Eintrag': data.Lz_ID
                    }
                };
                await promisedUpdateRecord(args);
                toast('Der FA-Status wurde ERLEDIGT IN ABWICKLUNG umgestellt! (wegen Bereich Freigabemuster)', 'warning', {
                    delay: 0
                });
            }
        }
    }

    writeLog(328, 'FA Status umgestellt auf: ' + umstell, data.Lz_ID);


    // Auftrag erledigen prüfen
    args = {
        object_id: 16,
        field_name: 'Count(Eintrag)',
        condition: {
            Auftrag_ID: data.Auftrag_ID,
            Gebucht: 0,
        },
        condition_text: 'Gruppe_ID <> 9'
    };
    const prom_au_erl = promisedDLookup(args);
    let look_au_erl = await prom_au_erl;
    if (parseInt(look_au_erl.DATA) === 0) {
        args = {
            object_id: 7,
            values: {
                'Erledigt': 1
            },
            condition: {
                'Eintrag': data.Auftrag_ID
            }
        };
        await promisedUpdateRecord(args);

        writeLog(7, 'Auftrag wurde erledigt, weil ' + look_au_erl.DATA + ' Positionen offen waren!', data.Auftrag_ID);
        toast('Auftrag wurde erledigt.', 'info');

    } else {

        writeLog(7, 'Auftrag wurde nicht erledigt, weil ' + look_au_erl.DATA + ' Positionen offen waren!', data.Auftrag_ID);
        toast('Auftrag wurde nicht erledigt.', 'info');

    }

    writeLog(25, 'Kat1: Lieferschein wurde aus ' + (data.Lz_ID > 0 ? 'FAG ' + data.Lz_ID : 'Auftrag ' + data.Auftrag_ID) + ' erzeugt!', ins_make_ls.DATA);

    showProgress(100, L('ORDER_IN_PROGRESS', 'macromsgs'));
    table.ajax.reload();
    if (data.Autom == 1) {
        data.report_filename = 'Lieferschein';
        data.Sprache = 0;
        data.Report_ID = (data.Sprache === 0 ? 22 : 363);

        const p_report = promisedCreateReport({
            object_id: data.Report_ID,
            data_id: ins_make_ls.DATA,
            file_name: data.report_filename + (data.Sprache === 0 ? '' : '_en'),
            file_ext: 'tex',
            output_file_name: 'HTV ' + ins_make_ls.DATA,
            output_format: 'pdf'
        });

        const no_report = L('NO_REPORT', 'macromsgs');
        data.Report = await p_report; // jshint ignore:line
        if (!data.Report.DATA) {
            toast(no_report, 'error');
            writeLog(25, 'Lieferscheinausdruck konnte nicht erstellt werden: ' + JSON.stringify(data.Report), ins_make_ls.DATA);
        } else {
            window.open(data.Report.file_path.replace('var/www/html/', ''));
        }
    } else {
        open_form({
            "Object_ID": 25,
            "Data_ID": ins_make_ls.DATA,
            "tab": 1
        });
    }

} else {
    toast('Die PP+LS-Optionen sind nicht zulässig. Probieren Sie andere Optionen!', 'error', {
        displayTime: 0,
        closeIcon: false
    });
    writeLog(328, 'Verspätete Lieferung bei FAG', data.Lz_ID);
    showProgress(100, L('ORDER_IN_PROGRESS', 'macromsgs'));
    return;
}