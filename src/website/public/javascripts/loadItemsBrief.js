function loadItemsBrief(cat){
$("#autoList").empty();
    var highestBid, currentBid;
    $.getJSON('/api/1.0/buzz/item/find?v=true&category='+cat, function (json) {
		$.each(json.items,function(i,data) {
            highestBid=0;
            for(var j=0;j<data.allBids.length;j++)
            {
                currentBid=parseInt(data.allBids[j].bid);
                if(currentBid>highestBid)
                    highestBid=currentBid;
            }
            if(highestBid==0)
                highestBid="None";
		$('#autoList').append('<li data-theme="c"><a id="touchableButton" href="#viewItemDetail" onClick="return loadItemDetailed(\''+data._id+'\');" data-transition="slide" class="touchableButton"><div style="display: inline-block"><img style="width: 100px" src="https://ec2-54-245-54-168.us-west-2.compute.amazonaws.com/api/1.0/resource?q='+data.fileUrls[0]+'"></div><div style="display: inline-block"><h5>Title: '+data.name+'</h5><h5>Highest Bid: '+highestBid+'</h5><h5>Condition: '+data.condition+'</h5></div></a></li>').trigger('create');
		$('#autoList').listview().listview('refresh');
	});
});
}