$(function(){
    $('select[id="transChange"]').change(function() {
        var nextpage = $(this).children('option:selected').attr('value');

        if(nextpage=='#allTransPage'){
            loadTransAll(document.getElementById('nusID').value);
        }
        else if(nextpage=='#itemsWithBiddersPage'){
            loadTransPending(document.getElementById('nusID').value);
        }
        else if(nextpage=='#itemsBiddedForPage'){
            loadTransBidded(document.getElementById('nusID').value);
        }
    });
});