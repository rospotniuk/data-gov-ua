/**
 * Created by codgod on 8/21/16.
 */

$(function () {
     $("#select_sequences").on("click", function() {
         $("#select_sequences").removeClass("inactive-button");
         $("#select_tree").addClass("inactive-button");
         $("#tree_chart").css("display", "none");
         $("#sequences_chart").css("display", "block");
    });

    $("#select_tree").on("click", function() {
        $("#select_tree").removeClass("inactive-button");
        $("#select_sequences").addClass("inactive-button");
        $("#sequences_chart").css("display", "none");
        $("#tree_chart").css("display", "block");
    });
});