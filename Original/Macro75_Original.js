let condition_text;
let values;
let procedure_name = 'get_standard_steps';
let table = $(selektor).DataTable();

// IsLoaded FormLoaded
// data.Form_ID = $('form').data('data-id');
data.Form_ID = parseInt($('form').attr('id').replace('form_', ''));

if (parseInt(data.Form_ID) == 50) {

    let PM_ID = $('.form').find("input[name=\'Eintrag\']").val();
    let Plan_ID = $('.form').find("input[name=\'Plan_ID\']").val();

    /* =================================================================
    showProgress(50, 'Standardschritte werden hinzugefügt');
    if (!data.hasOwnProperty('Ins_Steps')) {
        let args = {
            object_id: 60,
            from: 'Pruefmittel_standardsteps',
            values: {
                "PM_ID": PM_ID,
                "Vorgang_ID": '%Eintrag',
                "Akkret": '%Akkret',
                "Beschreibung": '%Beschreibung',
                "Position": '%Position',
                "Information": '%Hinweis'
            },
            condition: {
                "PM_ID": PM_ID
            }
        };
        insertInto(args, procedure_name, data, 'Ins_Steps');
        return;
    }
    if (data.Ins_Steps === false) {
        toast('Fehler beim Kopieren der Prüfschritte', 'error');
        return;
    }
    ================================================================*/


    showProgress(30, 'alle Standardschritte ermitteln');
    const prom_open_steps = promisedOpenRecordset({
        object_id: 80,
        field_name: ['Eintrag', 'Position'],
        condition: {
            Plan_ID: Plan_ID
        },
        order_by: 'Eintrag'
    });
    const open_steps = await prom_open_steps; // jshint ignore:line

    showProgress(80, 'fehlende Schritte werden ergänzt');

    let prom_ins_step = [];
    console.log('test0', open_steps);


    for (let v in open_steps.DATA) {

        console.log('test', open_steps[v]);
        // open_steps.DATA.forEach(async function(v, i) { // jshint ignore:line
        const prom_has_step = promisedDLookup({
            object_id: 60,
            field_name: 'Count(Eintrag)',
            condition: {
                PM_ID: PM_ID,
                Vorgang_ID: open_steps.DATA[v].Eintrag,
                Position: open_steps.DATA[v].Position
            },
            condition_text: 'Pruefung_ID Is Null'
        });
        const look_has_step = await prom_has_step; // jshint ignore:line
        console.log('Schritt ' + look_has_step.DATA);
        if (parseInt(look_has_step.DATA) === 0) {
            prom_ins_step.push(promisedInsertInto({
                object_id: 60,
                from: 'Vorgaenge',
                values: {
                    PM_ID: PM_ID,
                    Vorgang_ID: '%Eintrag',
                    Akkret: '%Akkret',
                    Position: '%Position',
                    Information: '%Hinweis'
                },
                condition: {
                    Plan_ID: Plan_ID,
                    Eintrag: open_steps.DATA[v].Eintrag,
                    Position: open_steps.DATA[v].Position
                }
            }));
        }
        if (parseInt(look_has_step.DATA) === 1) {
            prom_ins_step.push(promisedUpdateRecord({
                object_id: 60,
                from: 'Vorgaenge INNER JOIN Schritte ON Vorgaenge.Eintrag = Schritte.Vorgang_ID',
                select: {
                    Akkret: '[Vorgaenge].[Akkret]',
                    Information: '[Vorgaenge].[Hinweis]'
                },
                condition: {
                    'Schritte.PM_ID': PM_ID,
                    'Schritte.Vorgang_ID': open_steps.DATA[v].Eintrag,
                    'Schritte.Position': open_steps.DATA[v].Position
                },
                condition_text: "(Schritte.Information Is Null Or Schritte.Information = '')"
            }));
        }
        //});
    }
    //console.log(prom_ins_step);
    await Promise.all(prom_ins_step); // jshint ignore:line


    showProgress(100, 'fehlende Standardschritte wurden ergänzt');
    table.ajax.reload();
    toast(L('READY', 'macromsgs'));

} else {
    toast('Aktion in diesem Formular nicht möglich.', 'info');
}