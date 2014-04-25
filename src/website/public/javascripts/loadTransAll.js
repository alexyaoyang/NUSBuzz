function loadTransAll(nusID){
    $("#transList").empty();
    var highestBid, currentBid;
    $("#allTrans1").attr('selected','true');
    $.getJSON('/api/1.0/buzz/item/find?v=true&nusID='+nusID, function (json) {
		$.each(json.items,function(i,data) {
            highestBid=0;
            for(var j=0;j<data.allBids.length;j++)
            {
                currentBid=parseInt(data.allBids[j].bid);
                if(currentBid>highestBid)
                    highestBid=currentBid;
            }
		$('#transList').append('<li data-theme="c"><a id="touchableButton" href="#viewItemDetail" onClick="return loadItemDetailed(\''+data._id+'\');" data-transition="slide" class="touchableButton"><div style="display: inline-block"><img style="width: 100px" src="https://ec2-54-245-54-168.us-west-2.compute.amazonaws.com/api/1.0/resource?q='+data.fileUrls[0]+'"></div><div style="display: inline-block"><h5>Title: '+data.name+'</h5><h5>Minimum Bid: '+data.minBid+'</h5><h5>Highest Bid: '+highestBid+'</h5></div></a></li>').trigger('create');
		$('#transList').listview().listview('refresh');
	});
});
}

