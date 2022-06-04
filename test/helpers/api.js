import express from 'express';
import _ from 'lodash';

var app = express();
app.use(express.text());
app.use(express.json());


const router = express.Router();

router.get('/', function (req, res) {
    res.send('api');
});

router.get('/country', function (req, res) {
    res.send([{ "codigo": 4, "nome": "Afeganistão", "iso2": "AF", "iso3": "AFG" }, { "codigo": 710, "nome": "África do Sul", "iso2": "ZA", "iso3": "ZAF" }, { "codigo": 8, "nome": "Albânia", "iso2": "AL", "iso3": "ALB" }]);
});

router.get('/state', function (req, res) {
    res.send([{ "nome": "Acre", "sigla": "AC", "regiao": 1 }, { "nome": "Alagoas", "sigla": "AL", "regiao": 2 }, { "nome": "Amazonas", "sigla": "AM", "regiao": 1 }]);
});

router.get('/city', function (req, res) {
    res.send([{ "nome": "Teste", "sigla": "TE" }]);
});

router.get('/rent/:id', (req, res) => {
    var json = {
        "id": req.params.id,
        "ativoId": 40, "dataRecisao": null, "step": 8, "status": "N",
        "ativo": { "id": 40, "apelido": "galpao2", "dados": [], "enderecos": [], "envolvidos": [], "status": "V" },
        "envolvidos": [
            { "id": 204, "aluguelId": 68, "usuarioId": 1, "perfil": "C", "deleted": false },
            { "id": 205, "aluguelId": 68, "usuarioId": 2, "perfil": "L", "deleted": false },
            { "id": 206, "aluguelId": 68, "usuarioId": 3, "perfil": "P", "deleted": false },
            { "id": 207, "aluguelId": 68, "usuarioId": 6, "perfil": "P", "deleted": false },
            { "id": 208, "aluguelId": 68, "usuarioId": 5, "perfil": "P", "deleted": false }
        ]
    };
    res.send(json);
});

router.get('/house/:id', (req, res) => {
    var json = {
        "id": req.params.id,
        "apelido": "galpao 2",
        "dados": [
            { "id": 1364, "dadoTipoUid": "TIMOVEL", "dadoTipoUidPai": null, "usuarioId": null, "ativoId": 40, "operacaoId": null, "dado": "C-GP", "emissao": null, "validade": null, "origem": null }
        ],
        "enderecos": [
            {
                "usuarioId": null, "ativoId": 40, "dadoTipoUid": "END", "cep": "01010-000",
                "logradouro": "Rua São Bento", "bairro": "Centro", "numero": "3", "complemento": null,
                "municipio": 3550308, "municipioNome": "São Paulo", "estado": "SP"
            }
        ],
        "envolvidos": [
            { "usuarioId": 133, "usuarioNome": "DAVI BENJAMIN HENRY TEIXEIRA", "ativoId": 40, "ativoEnvolvidoTipoUid": "P" }
        ], "status": "N"
    };
    res.send(json);
});


var personList = {
    '1': {
        "id": 1, "nome": "LUIZ CARLOS", "email": "teste@teste.com", "status": "A", "perfilPadrao": "C", "quantidadeAtivos": 0,
        "enderecos": [
            {
                "usuarioId": 1, "ativoId": null, "dadoTipoUid": "END", "cep": "01010-000",
                "logradouro": "Rua São Bento", "bairro": "Centro", "numero": "1", "complemento": null,
                "municipio": 3550308, "municipioNome": null, "estado": "SP"
            }
        ]
    },
    '2': {
        "id": 2, "nome": "JOAQUIM PEDRO ALEXANDRE BARROS", "email": "teste02@teste.com", "status": "A", "perfilPadrao": "L", "quantidadeAtivos": 0,
        "enderecos": [
            {
                "usuarioId": 2, "ativoId": null, "dadoTipoUid": "END", "cep": "01010-000",
                "logradouro": "Rua São Bento", "bairro": "Centro", "numero": "3", "complemento": null,
                "municipio": 3550308, "municipioNome": null, "estado": "SP"
            }
        ]
    },
    '3': {
        "id": 3, "nome": "DAVI BENJAMIN HENRY TEIXEIRA", "email": "teste03@teste.com", "status": "A", "perfilPadrao": "A", "quantidadeAtivos": 1,
        "enderecos": [
            {
                "usuarioId": 3, "ativoId": null, "dadoTipoUid": "END", "cep": "01010-000",
                "logradouro": "Rua São Bento", "bairro": "Centro", "numero": "3", "complemento": null,
                "municipio": 3550308, "municipioNome": null, "estado": "SP"
            }
        ]
    },
    '4': {
        "id": 4, "nome": "LEONARDO SILVA", "email": "teste04@teste.com",
        "enderecos": [
            {
                "usuarioId": 1, "ativoId": null, "dadoTipoUid": "END", "cep": "01010-000",
                "logradouro": "Rua São Bento", "bairro": "Centro", "numero": "1", "complemento": null,
                "municipio": 3550308, "municipioNome": null, "estado": "SP"
            }
        ]
    },
    '5': {
        "id": 5, "nome": "RONALDO SANTOS", "email": "teste05@teste.com",
        "enderecos": [
            {
                "usuarioId": 2, "ativoId": null, "dadoTipoUid": "END", "cep": "01010-000",
                "logradouro": "Rua São Bento", "bairro": "Centro", "numero": "3", "complemento": null,
                "municipio": 3550308, "municipioNome": null, "estado": "SP"
            }
        ]
    },
    '6': {
        "id": 6, "nome": "RONALDO SANTOS", "email": "teste05@teste.com",
        "enderecos": [
            {
                "usuarioId": 3, "ativoId": null, "dadoTipoUid": "END", "cep": "01010-000",
                "logradouro": "Rua São Bento", "bairro": "Centro", "numero": "3", "complemento": null,
                "municipio": 3550308, "municipioNome": null, "estado": "SP"
            }
        ]
    },
};

router.get('/person', (req, res) => {
    return res.send(_.toArray(personList));
});

router.get('/person/:id', (req, res) => {
    if (personList[req.params.id])
        return res.send(personList[req.params.id]);
    res.status(404).send();
});

app.use(router);
var appService = app.listen(3000, () => {
    console.log(`Running on http://localhost:3000`);
});

export { app, appService };