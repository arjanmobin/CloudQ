var params = getHashParams();

var access_token = params.access_token,
    refresh_token = params.refresh_token,
    userID = params.user_id,
    error = params.error;

var socket = io();

var suggestions = []

socket.on("songSuggestion", (songData) => {
    suggestions.push(songData)
    addToPage(songData)
})

function addToPage(songData) {
    songDiv = document.createElement("div");
    $(songDiv).attr("class", "songDiv");
    $(songDiv).attr("uri", songData.uri)

    songNameDiv = document.createElement("div")
    songName = document.createElement("h5");
    $(songNameDiv).attr("class", "songName");

    $(songName).html(songData.title + " <br>by " + songData.artist);
    $(songNameDiv).append(songName)

    albumCover = document.createElement("img");
    $(albumCover).attr("src", songData.cover);
    $(albumCover).attr("class", "cover");

    buttons = document.createElement("div");
    accept = document.createElement("button");
    $(accept).attr("class", "control");
    $(accept).html("✓")
    $(accept).on("click", approveSong)

    deny = document.createElement("button");
    $(deny).attr("class", "control red");
    $(deny).html("✖")
    $(deny).on("click", removeSong)

    $(buttons).append(accept, deny)

    $(songDiv).append(albumCover, songNameDiv, buttons);
    $("#pending").prepend(songDiv);
}

 function approveSong(event) {
    $.ajax({
        method: "get",
        url: `https://api.spotify.com/v1/me/player/currently-playing`,
        headers: {
            'Authorization': 'Bearer ' + access_token,
        },
        success: (response) => {
            if (!response.is_playing) {
                alert("You must be playing a song to add to the queue.")
            } else {
                var songURI =  $(event.target.parentNode.parentNode).attr("uri")
                $("#approved").prepend(event.target.parentNode.parentNode)
                event.target.parentNode.removeChild(event.target)
                $.ajax({
                    method: "post",
                    url: `https://api.spotify.com/v1/me/player/queue?uri=${songURI}`,
                    headers: {
                        'Authorization': 'Bearer ' + access_token,
                    },
                    success: (response) => {
                        console.log("Queued")
                    }
                })
            }
        }
    })

    


}

function removeSong(event) {
    event.target.parentNode.parentNode.parentNode.removeChild(event.target.parentNode.parentNode)
}


if (error) {
    alert('There was an error during the authentication');

} else {
    if (access_token) {
        authData = {
            access_token,
            refresh_token
        }

        $.get("templates/oauth-template.hbs", (template) => {
            oauthTemplate = Handlebars.compile(template);
            $("#oauth").html(oauthTemplate(authData))
        }, "html");

        $.ajax({
            url: 'https://api.spotify.com/v1/me',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function (response) {

                $.get("templates/user-profile-template.hbs", (template) => {
                    userProfileTemplate = Handlebars.compile(template);
                    $("#user-info").html(userProfileTemplate(response));
                }, "html")

                $('#login').hide();
                $('#loggedin').show();
            }
        });


        

    } else {
        // render initial screen
        $('#login').show();
        $('#loggedin').hide();
    }

}
/**
* Obtains parameters from the hash of the URL
* @return Object
*/
function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while (e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
}
