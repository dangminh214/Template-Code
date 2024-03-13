/**
 *@author: d.nguyen
 *@description: modernisieren aus dem Macro 75
 *@dates: 13.03.2024 
 *@param: data = {} 
 */
 data = {...data,
    ids: {
        Vorgaenge_Datenquelle: 736,
        Wartungsschritt_Formular: 60,
        Wartungsplanvorgang_Formular: 80
    }
};

data.Form_ID = parseInt($('form').attr('id').replace('form_', ''));

if (parseInt(data.Form_ID) == 50) {
    data.PM_ID = $('.form').find("input[name=\'Eintrag\']").val();
    data.Plan_ID = $('.form').find("input[name=\'Plan_ID\']").val();
    showProgress(30, 'alle Standardschritte ermitteln');
    const open_steps = await dbAction('select', { //openRecordSet = select mit vielen Feldern
        object_id: data.ids.Wartungsplanvorgang_Formular,
        fields: ['Eintrag', 'Position'],
        conditions: [`Plan_ID = ${data.Plan_ID}`],
        order_by: 'Eintrag'
    });

    showProgress(80, 'fehlende Schritte werden ergänzt');
    console.log('test0', open_steps);

    for (let v in open_steps.DATA) {
        console.log('test', open_steps[v]);
        const look_has_step = await dbAction('select', {
            object_id: data.ids.Wartungsschritt_Formular,
            fields: ['Count(Eintrag) as count_Eintrag'],
            condition: [`PM_ID = ${data.PM_ID}`, `Vorgang_ID = ${open_steps.DATA[v].Eintrag}`, `Position = ${open_steps.DATA[v].Position}`, `Pruefung_ID Is Null`]
        });

        console.log('Schritt: ' + look_has_step.DATA);
        if (parseInt(look_has_step.DATA.length) === 0) {
            data.commands.select_daten_Vorgaenge = await dbAction('select', {
                object_id: data.ids.Vorgaenge_Datenquelle,
                fields: ['Eintrag', 'Akkret', 'Position', 'Hinweis'], //gibt es keine Akkret und Hinweis in diesem Object
            });

            await dbAction('insert', {
                object_id: data.ids.Wartungsschritt_Formular,
                values: {
                    PM_ID: data.PM_ID,
                    Vorgang_ID: Number(data.commands.select_daten_Vorgaenge.DATA[0].Eintrag),
                    Akkret: '%Akkret',
                    Position: data.commands.select_daten_Vorgaenge.DATA[0].Position,
                    Information: '%Hinweis'
                },
                conditions: [`Plan_ID = ${data.Plan_ID}]`, `Eintrag = ${open_steps.DATA[v].Eintrag}`, `Position =${open_steps.DATA[v].Position}`]
            });
        }
        if (parseInt(look_has_step.DATA.length) === 1) {
            let select_JOIN_Akkret_Hinweis = await dbAction('select', {
                object_id: data.ids.Wartungsschritt_Formular,
                fields: ['Akkret', 'Hinweis'],
                join: [
                    [data.ids.Vorgaenge_Datenquelle, 'Eintrag', data.ids.Wartungsschritt_Formular, 'Vorgang_ID']
                ],
                conditions: {
                    [data.ids.Wartungsschritt_Formular]: [`PM_ID = ${data.PM_ID}`, `Vorgang_ID = ${open_steps.DATA[v].Eintrag}`,
                        `Position: ${open_steps.DATA[v].Position}`, `Information Is Null Or Information = ''`
                    ]
                }
            });
            let update_Akkret_Hinweis_Wartungsschritt = await dbAction('update', {
                object_id: data.ids.Wartungsschritt_Formular,
                values: {
                    Akkret: select_JOIN_Akkret_Hinweis.DATA[0].Akkret,
                    Information: select_JOIN_Akkret_Hinweis.DATA[0].Hinweis
                },
                conditions: [`PM_ID = ${data.PM_ID}`, `Vorgang_ID = ${open_steps.DATA[v].Eintrag}`, `Position = ${open_steps.DATA[v].Position}`, `Information Is Null Or Information = ''`]
            });
        }
    }
    showProgress(100, 'fehlende Standardschritte wurden ergänzt');
    listReloadHelper();
    toast(L('READY', 'macromsgs'));
} else {
    toast('Aktion in diesem Formular nicht möglich.', 'info');
}