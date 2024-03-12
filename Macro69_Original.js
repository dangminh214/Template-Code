let procedure_name = 'create_forecastlist';

if (!data.hasOwnProperty('User')) {
    showProgress(20, 'Benutzer wird ermittelt');
    get_user_data(procedure_name, data, 'User');
    return;
}
if (data.User === false) {
    toast('Fehler beim Ermitteln des Users', 'error');
    showProgress(100);
    return;
}
if (!data.hasOwnProperty('Vertreter_ID')) {
    showProgress(40, 'Vertreter Informationen werden geholt');
    let args = {
        object_id: 8,
        field_name: 'Vertreter_ID',
        condition: {
            Sys_User_ID: data.User['User_ID']
        }
    };
    dLookup(args, procedure_name, data, 'Vertreter_ID');
    return;
}
if (data.Vertreter_ID === false) {
    toast('Fehler beim Ermitteln der Vertreter ID', 'error');
    showProgress(100);
    return;
}
if (!data.hasOwnProperty('Vertreter_Name')) {
    args = {
        object_id: 8,
        field_name: 'Name',
        condition: {
            Sys_User_ID: data.User['User_ID']
        }
    };
    dLookup(args, procedure_name, data, 'Vertreter_Name');
    return;
}
if (data.Vertreter_Name === false) {
    toast('Fehler beim Ermitteln des Namens', 'error');
    showProgress(100);
    return;
}
if (!data.hasOwnProperty('Jahr_Eingabe')) {
    showProgress(50, 'Benutzereingaben werden abgefragt');
    var current_date = new Date();
    input_value({
        "header": 'Geben sie das Jahr ein, für dass die Forecastliste erstellt werden soll.',
        "input": {
            "type": 'number',
            "value": current_date.getFullYear()
        }
    }, procedure_name, data, 'Jahr_Eingabe');
    return;
}
if (data.Jahr_Eingabe === false) {
    toast('Fehler bei der Eingabe des Jahres.', 'error');
    showProgress(100);
    return;
}
var year_test_regexp = new RegExp("20[1-4]\\d|2050"); // Regex zum Validieren der Jahreseingabe. Range: 2010-2050
if (!(year_test_regexp.test(data.Jahr_Eingabe))) {
    toast('Sie müssen eine gültige Jahreszahl eingeben. (2010 - 2050)', 'error');
    showProgress(100);
    return;
}
var current_date = new Date();
if (data.Jahr_Eingabe > (current_date.getFullYear() + 1)) { // Validieren, dass nicht zu weit im Voraus berechnet wird. Z.b macht es keinen Sinn für Q1 2020 in 2017 einen Forecast zu erstellen - die Jahresdaten sind noch nicht komplett
    toast('Sie können eine Forecastliste bis höchstens für das erste Quartal im nächsten Jahr im Voraus erstellen.', 'error');
    showProgress(100);
    return;
}
/**if (!data.hasOwnProperty('Quartal_Eingabe')) {
    showProgress(60, 'Benutzereingaben werden abgefragt');
    input_value('Geben sie das Quartal ein, für dass die Forecastliste erstellt werden soll.', 'number', procedure_name, data, 'Quartal_Eingabe');
    return;
}
**/
if (!data.hasOwnProperty('Quartal_Eingabe')) {
    var header = 'Wählen sie aus, für welches Quartal eine Forecastliste erstellt werden soll.';
    var options = {
        1: "Quartal 1",
        2: "Quartal 2",
        3: "Quartal 3",
        4: "Quartal 4"
    };
    showProgress(60, 'Benutzereingaben werden abgefragt');
    select_value(header, options, '*', procedure_name, data, 'Quartal_Eingabe');
    return;
}
if (data.Quartal_Eingabe === false) {
    toast('Fehler bei der Eingabe des Jahres.', 'error');
    showProgress(100);
    return;
}
if ((data.Jahr_Eingabe == current_date.getFullYear() + 1) && (data.Quartal_Eingabe != 1)) { // Validieren, dass nicht zu weit im Voraus berechnet wird. Z.b macht es keinen Sinn für Q1 2020 in 2017 einen Forecast zu erstellen - die Jahresdaten sind noch nicht komplett
    toast('Sie können eine Forecastliste bis höchstens für das erste Quartal im nächsten Jahr im Voraus erstellen.', 'error');
    showProgress(100);
    return;
}

var quarter_test_regexp = new RegExp("[1-4]"); // Regex zum Validieren der Quartaleingabe. Range: 1-4
if (!(quarter_test_regexp.test(data.Quartal_Eingabe))) {
    toast('Sie müssen ein gültiges Quartal eingeben (1-4)', 'error');
    showProgress(100);
    return;
}
/**if (!data.hasOwnProperty('Vertreter_Eingabe')) {
    input_value('Vertreter ID, für die angelegt werden soll.', 'number', procedure_name, data, 'Vertreter_Eingabe');
    return;
}
if (data.Vertreter_Eingabe === false) {
    toast('Fehler bei der Eingabe der Vertreter ID', 'error');
    showProgress(100);
    return;
}
**/
if (!data.hasOwnProperty('Choice_Answer')) {
    var choice_text = 'Möchten sie eine Forecastliste für ' + data.Vertreter_Name + ' mit Vertreter ID ' + data.Vertreter_ID + ' für ' + data.Jahr_Eingabe + ' Q' + data.Quartal_Eingabe + ' anlegen? Falls eine Forecastliste für ' + data.Jahr_Eingabe + ' Q' + data.Quartal_Eingabe + ' bereits besteht, wird diese überschrieben.';
    choice(choice_text, procedure_name, data, 'Choice_Answer');
    return;
}
if (data.Choice_Answer === false) {
    toast('Operation wurde durch den Benutzer abgebrochen.', 'error');
    showProgress(100);
    return;
}
if (!data.hasOwnProperty('SP_Values')) {
    showProgress(80, 'Liste wird erstellt');
    //var values = '' + data.Vertreter_ID + ',' + data.Jahr_Eingabe + ',' + data.Quartal_Eingabe + ',10000'; // Parameter für die Prozedur: Vertreter_ID, Jahr, Quartal, Mindestsumme
    let values = [data.Vertreter_ID,data.Jahr_Eingabe,data.Quartal_Eingabe,10000];
    get_mssql_spvalues('Forecast_Generieren', values, procedure_name, data, 'SP_Values');
    console.log(values);
    console.log(data);
    return;
}
/**if (data.SP_Values === false) {
    toast('Fehler beim ausführen der Prozedur', 'error');
    showProgress(100);
    return;
}**/


toast('Liste erfolgreich angelegt.');
console.log(data);
console.log(year_test_regexp);
showProgress(100);