import { Controller, Get, Header } from '@nestjs/common';
import { contract } from '@erp/contracts';
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { Public } from '../auth/auth.decorators.js';

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

/** OpenAPI spec generated from the shared contract, plus a Swagger UI to explore it. */
@Controller()
@Public()
export class OpenApiController {
  @Get('openapi.json')
  spec() {
    return generator.generate(contract, {
      info: { title: 'ERP Workshop API', version: '0.0.0' },
      servers: [{ url: '/api' }],
    });
  }

  @Get('docs')
  @Header('Content-Type', 'text/html')
  docs() {
    return `<!doctype html>
<html>
  <head>
    <title>ERP Workshop API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: './openapi.json', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`;
  }
}
