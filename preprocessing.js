var MyExtensionJavaScriptPreprocessingClass = function () { };

MyExtensionJavaScriptPreprocessingClass.prototype = {
    run: function (args) {
        args.completionFunction({
            "title": document.title,
            "url": window.location.href,
            "canonicalUrl": document.querySelector('link[rel="canonical"]')?.href,
            "ogTitle": document.querySelector('meta[property="og:title"]')?.content,
            "ogImage": document.querySelector('meta[property="og:image"]')?.content,
            "ogDescription": document.querySelector('meta[property="og:description"]')?.content,
            "previewImage": this.getBestImage()
        });
    },

    getBestImage: function () {
        // Try OpenGraph first
        var og = document.querySelector('meta[property="og:image"]');
        if (og && og.content) return og.content;

        // Try Twitter card
        var twitter = document.querySelector('meta[name="twitter:image"]');
        if (twitter && twitter.content) return twitter.content;

        // Try largest image
        var imgs = Array.from(document.getElementsByTagName('img'));
        if (imgs.length > 0) {
            var largest = imgs.reduce((prev, curr) => {
                return (prev.width * prev.height > curr.width * curr.height) ? prev : curr;
            });
            if (largest && largest.src && largest.width > 200) {
                return largest.src;
            }
        }

        return null;
    }
};

var ExtensionPreprocessingJS = new MyExtensionJavaScriptPreprocessingClass();
