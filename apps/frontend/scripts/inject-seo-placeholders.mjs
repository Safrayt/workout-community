// Заменяет метки <!--seo-head--> и <!--seo-body--> в собранном
// index.html на шаблонные вставки Caddy (директива templates).
// Запускается в Dockerfile после `vite build`.
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2] ?? "dist/index.html";
let html = readFileSync(file, "utf8");

const pathArg = "(.OriginalReq.URL.Path | urlquery)";

const parts = [
    ["seo-head", `{{httpInclude (printf "/api/seo/head?path=%s" ${pathArg})}}`],
    ["seo-body", `{{httpInclude (printf "/api/seo/body?path=%s" ${pathArg})}}`],
];

for (const [name, template] of parts) {
    const pattern = new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`);

    if (!pattern.test(html)) {
        console.error(`В ${file} не найдена метка <!--${name}-->…<!--/${name}-->`);
        process.exit(1);
    }

    html = html.replace(pattern, () => template);
}

writeFileSync(file, html);
console.log(`SEO-вставки добавлены в ${file}`);
