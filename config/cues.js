/* vault-cues.js
   Purpose: Daily rotating inspirational quotes for the Practice tab
   Usage: Include this script before vault-ui.js
*/

(function(){
  'use strict';

  window.VaultCues = {
    quotes: [
   
      "Consistency beats intensity. Small, focused sessions add up.",
      "Back in the woodshed today. Pick one thing and go deep.",
      "Play it slow, play it right.",
      "Choose one thing and give it your full attention.",
      "Clean up your timing before adding clever ideas.",
      "Depth beats variety when progress stalls.",
      "Slow practice is still real practice.",
      "If it feels easy, refine it. If it feels hard, simplify it.",
      "Progress, not perfection.",
      "Small improvements compound faster than big intentions.",
      "Every mistake is a small lesson.",
      "Repetition builds confidence. Awareness builds control.",
      "Hard work pays off.",
      "Practice what makes the music feel better, not busier.",
      "Speed comes with time.",
      "One solid, focused session today is enough.",
      "Consistency is quieter than motivation, but stronger.",
      "Precision now saves effort later.",
      "Make the simple things feel good.",
      "Don’t chase speed. Let it arrive.",
      "Good habits show up even on average days.",
      "Listen to the space between the notes.",
      "Play with intention.",
      "If you’re stuck, reduce the problem.",
      "Progress often feels boring before it feels obvious.",
      "Musical choices matter more than technical ones.",
      "Finish today knowing exactly what to practice next time.",
      "Small wins, daily.",
      "Clarity is a better goal than complexity.",
      "Let the tempo reveal what needs work.",
      "If something feels rushed, it probably is.",
      "Control comes before confidence.",
      "Good timing survives bad days.",
      "Fewer notes, better placement.",
      "Work until it sounds deliberate.",
      "Practice makes progress.",
      "Technique should disappear into the music.",
      "Stay curious about what feels uncomfortable.",
      "Repeat it until it stops asking questions.",
      "Trust slow progress. It lasts longer.",
      "Time spent listening counts.",
      "Keep your focus narrower than your ambition.",
      "Accuracy earns freedom later.",
      "If it sounds forced, take something away.",
      "Solid fundamentals age well.",
      "Embrace the struggle.",
      "End the session with something clean.",
      "Play it the way you want it to sound.",
      "Your time and feel improve when you stop rushing outcomes.",
      "Practice the parts you usually avoid.",
      "Stay relaxed where tension usually sneaks in.",
      "Solve the problem once, then reinforce it.",
      "If the groove feels unstable, simplify the limbs.",
      "Practice enough to make today’s work easy to return to.",
      "When in doubt, slow down and listen.",
      "Don’t polish what isn’t consistent yet.",
      "Practice until it feels predictable.",
      "Notice where your attention drifts.",
      "Stability first, variation second.",
      "Practice with intent, not urgency.",
      "Keep the idea steady before adding more details.",
      "Practice until it sounds intentional.",
      "Let repetition smooth the rough edges.",
      "Clean movement supports clean sound.",
      "If it feels awkward, isolate it.",
      "Don’t rush past what still needs clarity.",
      "Control the notes you play, not the ones you imagine.",
      "Notice what changes when you relax.",
      "Return to the basics when things feel messy.",
      "Practice the version you can repeat.",
      "Work at the tempo that reveals mistakes.",
      "Let the groove settle before adjusting it.",
      "End the session knowing what worked.",
      "Quality over quantity.",
    ],

    getDailyQuote: function(){
      var now = new Date();
      var start = new Date(now.getFullYear(), 0, 0);
      var diff = now - start;
      var oneDay = 1000 * 60 * 60 * 24;
      var dayOfYear = Math.floor(diff / oneDay);
      var index = dayOfYear % this.quotes.length;
      return this.quotes[index];
    }
  };
})();
