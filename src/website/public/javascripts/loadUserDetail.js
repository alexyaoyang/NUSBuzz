$(document).ready(function () {
$.getJSON('/api/1.0/user/details', function (data) {
    $('input[id="nusID"]').val(data.nusID);
    $('input[id="handphone"]').val(data.handphone);
    $('input[id="name"]').val(data.name);
    $('input[id="email"]').val(data.email);
    $('input[id="dateJoin"]').val(data.dateJoin);
    //$('input[id="rep"]').val(data.rep);
        if(data.alerts=='Mobile'){
            $('input[id="mobileAlert"]').attr('checked',true).checkboxradio().checkboxradio("refresh");
            $('input[id="emailAlert"]').attr('checked',false).checkboxradio().checkboxradio("refresh");
        }
        else{
            $('input[id="mobileAlert"]').attr('checked',false).checkboxradio().checkboxradio("refresh");
            $('input[id="emailAlert"]').attr('checked',true).checkboxradio().checkboxradio("refresh");
        }
});
});