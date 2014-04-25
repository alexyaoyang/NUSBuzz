function loadItemDetailed(id){
    var highestBid,currentBid;
    $.getJSON('/api/1.0/buzz/item?id='+id, function (data) {
        highestBid=0;
        for(var j=0;j<data.allBids.length;j++)
        {
            currentBid=parseInt(data.allBids[j].bid);
            if(currentBid>highestBid)
                highestBid=currentBid;
        }
        if(highestBid==0)
            highestBid="None";
        //if current user is also the seller, then don't allow him to bid
		if(document.getElementById('nusID').value==data.nusID){
		document.getElementById('placeBid').disabled=true;
		}
		else{
		document.getElementById('placeBid').disabled=false;
		}
        $('input[id="placeBid"]').button('refresh');

		$('input[id="id"]').val(id);
		$('input[id="iname"]').val(data.name);
		$('input[id="nusbID"]').val(document.getElementById('nusID').value);
		$('input[id="idetail"]').val(data.detail);
		$('input[id="itags"]').val(data.tags);
		$('input[id="iminBid"]').val(data.minBid);
		$('input[id="icondition"]').val(data.condition);
		$('input[id="icategory"]').val(data.category);
		$('input[id="iAllBids"]').val(data.allBids);
        $('input[id="iHighestBid"]').val(highestBid);
		$('img[id="ifile"]').attr('src','https://ec2-54-245-54-168.us-west-2.compute.amazonaws.com/api/1.0/resource?q='+data.fileUrls[0]);
        $('a[id="afile"]').attr('href','https://ec2-54-245-54-168.us-west-2.compute.amazonaws.com/api/1.0/resource?q='+data.fileUrls[0]);
        //$('div[class="ps-carousel-item ps-carousel-item-0"] img').attr('src',document.getElementById('ifile').getAttribute('src'));
	});
}