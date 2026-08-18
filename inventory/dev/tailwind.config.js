/* Used only when rebuilding the CSS that is inlined into ../index.html.
   Not needed to run the app. */
module.exports = {
  content: ['./.scan.tmp.html'],
  theme: {
    extend: {
      colors: {
        ink:   { 50:'#f6f7f9',100:'#eceef2',200:'#d5d9e2',300:'#b0b8c8',400:'#8591a8',
                 500:'#66738c',600:'#515c73',700:'#424b5e',800:'#3a4150',900:'#343945',950:'#22252d' },
        brandc:{ 50:'#f0f7ff',100:'#e0eefe',200:'#b9ddfe',300:'#7cc2fd',400:'#36a3fa',
                 500:'#0c87eb',600:'#006ac9',700:'#0155a3',800:'#064986',900:'#0b3d6f',950:'#07264a' }
      }
    }
  }
};
