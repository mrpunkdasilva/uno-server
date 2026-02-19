# Middleware de cache
## Geração de chave
O middlewade de cache gera uma chave única baseada em:
- Método HTTP
- URL completa (path)
- Query parameters
- Headers específicos

Exemplo de chave:
```
GET /api/users?limit=10
```

## FLuxo de requisição

````
┌─────────────────┐
│   Requisição    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gerar Chave     │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ Cache? │
    └───┬─┬──┘
        │ │
    HIT │ │ MISS
        │ │
        ▼ ▼
    ┌───────┐  ┌──────────────┐
    │Retorna│  │Executa Handler│
    │ Cache │  └──────┬───────┘
    └───────┘         │
        │             ▼
        │      ┌──────────────┐
        │      │Cacheia Resp. │
        │      └──────┬───────┘
        │             │
        └─────┬───────┘
              │
              ▼
        ┌──────────┐
        │ Resposta │
        └──────────┘
````

## Headers de Resposta

As respostas do middleware devem incluir headers informativos, por exemplo:
- `X-Cache-Hit`: Indica se a resposta foi obtida do cache (`true` ou `false`)
- `X-Cache-Key`: Chave utilizada para armazenar a resposta no cache

## LRU
Utilizamos LRU para manter os itens mais acessados recentemente, removendo os mais antigos quando o limite é atingido. Definimos a seguinte orfem de prioridade:
1. Itens mais recentes = maior prioridade
2. Itens mais acessados = maior prioridade
3. Acessos renovam a posição no cache

## Expiração e renovação

Cada item tem um timestamp de expiração, utilizando `maxAge`. Para renovação automática, quando um item é acessado:
1. Verifica se está expirado
2. Se válido, renova o timestamp
3. Move para o final (mais recente)
4. Retorna o valor
