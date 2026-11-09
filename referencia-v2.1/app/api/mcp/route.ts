import { mcpTools } from '@/lib/mcp/tools'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

const PROTOCOL_VERSION = '2025-06-18'

function reply(id: JsonRpcRequest['id'], result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result })
}

function fail(id: JsonRpcRequest['id'], code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } })
}

export async function POST(req: Request) {
  let body: JsonRpcRequest
  try {
    body = await req.json()
  } catch {
    return fail(undefined, -32700, 'Parse error')
  }

  switch (body.method) {
    case 'initialize':
      return reply(body.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'sonar-mcp', version: '0.1.0' },
      })
    case 'notifications/initialized':
      return new Response(null, { status: 202 })
    case 'tools/list':
      return reply(body.id, {
        tools: mcpTools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      })
    case 'tools/call': {
      const name = body.params?.name
      const tool = mcpTools.find((t) => t.name === name)
      if (!tool) return fail(body.id, -32602, `Unknown tool: ${String(name)}`)
      const args = (body.params?.arguments ?? {}) as Record<string, unknown>
      const data = await tool.handler(args)
      return reply(body.id, { content: [{ type: 'text', text: JSON.stringify(data) }] })
    }
    default:
      return fail(body.id, -32601, 'Method not found')
  }
}

export function GET() {
  return Response.json({ name: 'sonar-mcp', transport: 'http', tools: mcpTools.map((t) => t.name) })
}
