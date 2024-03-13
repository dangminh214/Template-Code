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
        Fertigungsauftrag_Formular: 328,
        Kunde_DB: 921
    }
};

data.KundeID = Number((new URLSearchParams(window.location.href)).get('data_id'));
data.neuKundeID = userAction('remote', {
    header: 'Wählen Sie bitte einen anderen Kunde um die Daten zu verschieben',
    simple_answer: true,
    remote: {
        object_id: data.ids.Kunde_DB,
        fields: ['Eintrag as value', 'Name as text'],
        conditions: ['Name LIKE %{query}%'],
        oder_by: ['Name']
    }
});

console.log('neuKundeID', data.neuKundeID);

data.commands.select_Auftrag_von_Kunde = await dbAction('select', {
    object_id: data.ids.Auftrag_Formular,
    fields: ['Eintrag'],
    conditions: [`Kunde_ID =  ${data.KundeID}`, 'MandantID = 1']
});

if (data.commands.select_Auftrag_von_Kunde.DATA.length <= 0) {
    toast('Diese Kunde hat keine Aufträge');
} else {
    data.choice_verschiebenDaten = await userAction('choice', {
        header: 'Wollen Sie Fertigungsauftrag verschieben',
        simple_answe: true,
    });
    if (data.choice_verschiebenDaten) {
        for (let i in data.commands.select_Fertigungsauftrag_von_Kunde) {
            data.commands.update_Auftrag = await dbAction('update', {
                object_id: data.ids.Auftrag_Formular,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.select_Fertigungsauftrag_von_Kunde.DATA[i].Eintrag}`, `Mandant_ID = ${data.MandantID}`]
            });
        }
    }
}
data.commands.selectFertigungsauftrag = await dbAction('select', {
    object_id: data.ids.Fertigungsauftrag_Formular,
    fields: ['Eintrag'],
    conditions: [`Kunde_ID =  ${data.KundeID}`]
});

if (data.commands.selectFertigungsauftrag.DATA.length <= 0) {
    toast('Diese Kunde hat keine Fertigungsauftrag');
} else {
    data.choice_verschiebenDaten = await userAction('choice', {
        header: 'Wollen Sie Fertigungsauftrag verschieben',
        simple_answe: true,
    });
    if (data.choice_verschiebenDaten) {
        for (let i in data.commands.select_Fertigungsauftrag_von_Kunde) {
            data.commands.update_Auftrag = await dbAction('update', {
                object_id: data.ids.Fertigungsauftrag_Formular,
                values: {
                    Kunde_ID: data.neuKundeID
                },
                conditions: [`Eintrag = ${data.commands.selectFertigungsauftrag.DATA[i].Eintrag}`]
            });
        }
    }
} 
    
