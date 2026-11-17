import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
  Vibration,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANCOS_BRASIL = [
  { nome: 'Nubank', cor: '#820AD1' },
  { nome: 'Itaú', cor: '#EC7000' },
  { nome: 'Caixa Econômica', cor: '#005CA9' },
  { nome: 'Bradesco', cor: '#CC092F' },
  { nome: 'Banco do Brasil', cor: '#FFF100', corTexto: '#003366' },
  { nome: 'Santander', cor: '#EC0000' },
  { nome: 'Inter', cor: '#FF7A00' },
  { nome: 'C6 Bank', cor: '#242424' },
  { nome: 'PicPay', cor: '#11C76F' },
  { nome: 'Outro / Dinheiro / Pix', cor: '#8E8E93' },
];

const MESES = [
  { id: '01', nome: 'Janeiro' },
  { id: '02', nome: 'Fevereiro' },
  { id: '03', nome: 'Março' },
  { id: '04', nome: 'Abril' },
  { id: '05', nome: 'Maio' },
  { id: '06', nome: 'Junho' },
  { id: '07', nome: 'Julho' },
  { id: '08', nome: 'Agosto' },
  { id: '09', nome: 'Setembro' },
  { id: '10', nome: 'Outubro' },
  { id: '11', nome: 'Novembro' },
  { id: '12', nome: 'Dezembro' },
];

const tocarSom = (tipo) => {
  try {
    let caminho = '';
    if (tipo === 'dinheiro') {
      caminho = '/sounds/dinheiro.mp3';
    } else if (tipo === 'alerta') {
      caminho = '/sounds/alerta.mp3';
    }

    if (caminho) {
      const som = new Audio(caminho);
      som.play().catch(e => console.log('Áudio aguardando interação do usuário', e));
    }
  } catch (error) {
    console.log('Erro ao tocar áudio:', error);
  }
};

export default function App() {
  const mesAtualStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualStr);
  const [modalMesVisible, setModalMesVisible] = useState(false);
  const [modalAnualVisible, setModalAnualVisible] = useState(false);

  const [renda, setRenda] = useState('');
  const [rendaExtraDesc, setRendaExtraDesc] = useState('');
  const [rendaExtraValor, setRendaExtraValor] = useState('');
  const [listaRendasExtras, setListaRendasExtras] = useState([]);

  const [nomeMeta, setNomeMeta] = useState('');
  const [valorMeta, setValorMeta] = useState('');
  const [mesesMeta, setMesesMeta] = useState('12');

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('fixa');
  const [bancoSelecionado, setBancoSelecionado] = useState('Nubank');
  const [modalBancoVisible, setModalBancoVisible] = useState(false);

  const [transacoes, setTransacoes] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [editandoId, setEditandoId] = useState(null);

  const jaTocouAlertaRef = useRef(false);
  const metaAtingidaAnteriorRef = useRef(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const salvarDadosNoDispositivo = async (novasTransacoes, novasRendas, novaRendaFixa, metaNome, metaValor, metaMeses) => {
    try {
      await AsyncStorage.setItem('@transacoes', JSON.stringify(novasTransacoes));
      await AsyncStorage.setItem('@rendasExtras', JSON.stringify(novasRendas));
      await AsyncStorage.setItem('@rendaFixa', novaRendaFixa);
      await AsyncStorage.setItem('@metaNome', metaNome);
      await AsyncStorage.setItem('@metaValor', metaValor);
      await AsyncStorage.setItem('@metaMeses', metaMeses);
    } catch (e) {
      console.log('Erro ao salvar', e);
    }
  };

  const carregarDados = async () => {
    try {
      const t = await AsyncStorage.getItem('@transacoes');
      const r = await AsyncStorage.getItem('@rendasExtras');
      const rf = await AsyncStorage.getItem('@rendaFixa');
      const mn = await AsyncStorage.getItem('@metaNome');
      const mv = await AsyncStorage.getItem('@metaValor');
      const mm = await AsyncStorage.getItem('@metaMeses');

      if (t) setTransacoes(JSON.parse(t));
      if (r) setListaRendasExtras(JSON.parse(r));
      if (rf) setRenda(rf);
      if (mn) setNomeMeta(mn);
      if (mv) setValorMeta(mv);
      if (mm) setMesesMeta(mm);
    } catch (e) {
      console.log('Erro ao carregar', e);
    }
  };

  const formatarNumeroInput = (texto) => {
    return texto.replace(',', '.');
  };

  const adicionarRendaExtra = () => {
    if (!rendaExtraDesc || !rendaExtraValor) return;
    Vibration.vibrate([0, 50, 50, 50]);
    tocarSom('dinheiro');

    const valorNumerico = parseFloat(formatarNumeroInput(rendaExtraValor)) || 0;
    const novaRenda = {
      id: Date.now().toString(),
      descricao: rendaExtraDesc,
      valor: valorNumerico,
      mes: mesSelecionado,
    };
    const atualizadas = [...listaRendasExtras, novaRenda];
    setListaRendasExtras(atualizadas);
    setRendaExtraDesc('');
    setRendaExtraValor('');
    salvarDadosNoDispositivo(transacoes, atualizadas, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const removerRendaExtra = (id) => {
    const atualizadas = listaRendasExtras.filter((r) => r.id !== id);
    setListaRendasExtras(atualizadas);
    salvarDadosNoDispositivo(transacoes, atualizadas, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const salvarTransacao = () => {
    if (!descricao || !valor) return;

    const valorNumerico = parseFloat(formatarNumeroInput(valor)) || 0;

    let novasTransacoes;
    if (editandoId) {
      novasTransacoes = transacoes.map((t) =>
        t.id === editandoId
          ? { ...t, descricao, valor: valorNumerico, tipo, banco: bancoSelecionado, mes: mesSelecionado }
          : t
      );
      setEditandoId(null);
    } else {
      const nova = {
        id: Date.now().toString(),
        descricao,
        valor: valorNumerico,
        tipo,
        banco: bancoSelecionado,
        mes: mesSelecionado,
      };
      novasTransacoes = [nova, ...transacoes];
    }

    setTransacoes(novasTransacoes);
    setDescricao('');
    setValor('');
    setTipo('fixa');
    salvarDadosNoDispositivo(novasTransacoes, listaRendasExtras, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const prepararEdicao = (item) => {
    setDescricao(item.descricao);
    setValor(item.valor.toString().replace('.', ','));
    setTipo(item.tipo);
    if (item.banco) setBancoSelecionado(item.banco);
    if (item.mes) setMesSelecionado(item.mes);
    setEditandoId(item.id);
  };

  const removerTransacao = (id) => {
    const novasTransacoes = transacoes.filter((t) => t.id !== id);
    setTransacoes(novasTransacoes);
    if (editandoId === id) {
      setEditandoId(null);
      setDescricao('');
      setValor('');
    }
    salvarDadosNoDispositivo(novasTransacoes, listaRendasExtras, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const limparTudo = () => {
    Alert.alert(
      'Zerar Planilha',
      'Tem a certeza que deseja apagar todos os lançamentos deste mês?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, zerar',
          style: 'destructive',
          onPress: () => {
            const novasTransacoes = transacoes.filter((t) => t.mes !== mesSelecionado);
            const novasRendasExtras = listaRendasExtras.filter((r) => !r.mes || r.mes !== mesSelecionado);
            setTransacoes(novasTransacoes);
            setListaRendasExtras(novasRendasExtras);
            setEditandoId(null);
            setDescricao('');
            setValor('');
            salvarDadosNoDispositivo(novasTransacoes, novasRendasExtras, renda, nomeMeta, valorMeta, mesesMeta);
          },
        },
      ]
    );
  };

  const compartilharWhatsApp = async () => {
    const nomeMesAtual = MESES.find(m => m.id === mesSelecionado)?.nome || '';
    const mensagem = 
      'Jonatha Planilha de Gastos (' + nomeMesAtual + ')\n\n' +
      'Renda Total: R$ ' + rendaTotalGeral.toFixed(2) + '\n' +
      'Total de Gastos: R$ ' + totalGasto.toFixed(2) + '\n' +
      'Saldo Livre: R$ ' + saldoRestante.toFixed(2) + '\n\n' +
      'Organizado com Gestão Financeira Inteligente!';

    const url = 'https://wa.me/?text=' + encodeURIComponent(mensagem);

    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  const rendaFixaNumerica = parseFloat(formatarNumeroInput(renda)) || 0;
  
  const rendasExtrasDoMes = listaRendasExtras.filter((r) => !r.mes || r.mes === mesSelecionado);
  const totalRendaExtra = rendasExtrasDoMes.reduce((acc, r) => acc + r.valor, 0);
  const rendaTotalGeral = rendaFixaNumerica + totalRendaExtra;

  const transacoesDoMes = transacoes.filter((t) => !t.mes || t.mes === mesSelecionado);

  const totalFixas = transacoesDoMes
    .filter((t) => t.tipo === 'fixa')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalVariaveis = transacoesDoMes
    .filter((t) => t.tipo === 'variavel')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalGasto = totalFixas + totalVariaveis;
  const saldoRestante = rendaTotalGeral - totalGasto;
  const ultrapassou = totalGasto > rendaTotalGeral && rendaTotalGeral > 0;

  let porcentagemGasta = rendaTotalGeral > 0 ? (totalGasto / rendaTotalGeral) * 100 : 0;
  if (porcentagemGasta > 100) porcentagemGasta = 100;

  const valorMetaNum = parseFloat(formatarNumeroInput(valorMeta)) || 0;
  const mesesMetaNum = parseInt(mesesMeta) || 12;
  const aporteMensalNecessario = valorMetaNum > 0 && mesesMetaNum > 0 ? valorMetaNum / mesesMetaNum : 0;
  const consegueAtingirMeta = valorMetaNum > 0 && rendaTotalGeral > 0 && saldoRestante >= aporteMensalNecessario;

  useEffect(() => {
    if (ultrapassou && !jaTocouAlertaRef.current) {
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      tocarSom('alerta');
      jaTocouAlertaRef.current = true;
    } else if (!ultrapassou) {
      jaTocouAlertaRef.current = false;
    }
  }, [ultrapassou]);

  useEffect(() => {
    if (consegueAtingirMeta && !metaAtingidaAnteriorRef.current) {
      Vibration.vibrate([0, 100, 80, 100]);
      metaAtingidaAnteriorRef.current = true;
    } else if (!consegueAtingirMeta) {
      metaAtingidaAnteriorRef.current = false;
    }
  }, [consegueAtingirMeta]);

  const investimentoPossivelAtual = Math.max(saldoRestante * 0.50, 0);
  const mediaSugeridaDiaria = rendaTotalGeral > 0 ? (rendaTotalGeral - totalFixas - aporteMensalNecessario) / 30 : 0;

  const transacoesFiltradas = transacoesDoMes.filter((t) => {
    if (filtro === 'fixa') return t.tipo === 'fixa';
    if (filtro === 'variavel') return t.tipo === 'variavel';
    return true;
  });

  const nomeMesSelecionado = MESES.find(m => m.id === mesSelecionado)?.nome || 'Mês';

  const calcularTotalMes = (idMes) => {
    const tMes = transacoes.filter((t) => t.mes === idMes);
    return tMes.reduce((acc, t) => acc + t.valor, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>Jonatha Planilha de Gastos</Text>
        <Text style={styles.subtituloHeader}>Gestão Financeira Inteligente</Text>

        <View style={styles.linhaSeleitoresMes}>
          <TouchableOpacity style={[styles.cardSeletorMes, { flex: 1, marginRight: 6 }]} onPress={() => setModalMesVisible(true)}>
            <Text style={styles.txtRotuloMes}>📅 Mês:</Text>
            <Text style={styles.txtMesAtivo}>{nomeMesSelecionado} ▼</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoVisaoAnual} onPress={() => setModalAnualVisible(true)}>
            <Text style={styles.txtBotaoAnual}>📊 Resumo Anual</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardRenda}>
          <Text style={styles.labelCard}>Renda Mensal Fixa (Salário)</Text>
          <TextInput
            style={styles.inputRenda}
            placeholder="Ex: 3500,00"
            placeholderTextColor="#8E8E93"
            keyboardType="decimal-pad"
            value={renda}
            onChangeText={(txt) => {
              setRenda(txt);
              salvarDadosNoDispositivo(transacoes, listaRendasExtras, txt, nomeMeta, valorMeta, mesesMeta);
            }}
          />
        </View>

        <View style={styles.cardRendaExtra}>
          <Text style={styles.subtituloForm}>💰 Entrada Extra ({nomeMesSelecionado})</Text>
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: 6 }]}
              placeholder="Ex: 13º Salário, PIS"
              placeholderTextColor="#8E8E93"
              value={rendaExtraDesc}
              onChangeText={setRendaExtraDesc}
            />
            <TextInput
              style={[styles.input, { flex: 1.2 }]}
              placeholder="Valor R$"
              placeholderTextColor="#8E8E93"
              keyboardType="decimal-pad"
              value={rendaExtraValor}
              onChangeText={setRendaExtraValor}
            />
          </View>
          <TouchableOpacity style={styles.btnRendaExtra} onPress={adicionarRendaExtra}>
            <Text style={styles.txtBtnRendaExtra}>+ Adicionar Renda Extra</Text>
          </TouchableOpacity>

          {rendasExtrasDoMes.length > 0 && (
            <View style={styles.boxListaExtra}>
              {rendasExtrasDoMes.map((item) => (
                <View key={item.id} style={styles.itemRendaExtra}>
                  <Text style={styles.txtItemExtra}>💵 {item.descricao}: +R$ {item.valor.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => removerRendaExtra(item.id)}>
                    <Text style={styles.txtDelExtra}>❌</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.tituloMeta}>🎯 Minha Meta Financeira</Text>
          <TextInput
            style={styles.input}
            placeholder="Objetivo (Ex: Investir R$ 5.000, Viagem)"
            placeholderTextColor="#8E8E93"
            value={nomeMeta}
            onChangeText={(txt) => {
              setNomeMeta(txt);
              salvarDadosNoDispositivo(transacoes, listaRendasExtras, renda, txt, valorMeta, mesesMeta);
            }}
          />
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: 6 }]}
              placeholder="Valor Total R$ (Ex: 5000,00)"
              placeholderTextColor="#8E8E93"
              keyboardType="decimal-pad"
              value={valorMeta}
              onChangeText={(txt) => {
                setValorMeta(txt);
                salvarDadosNoDispositivo(transacoes, listaRendasExtras, renda, nomeMeta, txt, mesesMeta);
              }}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Meses (Ex: 12)"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
              value={mesesMeta}
              onChangeText={(txt) => {
                setMesesMeta(txt);
                salvarDadosNoDispositivo(transacoes, listaRendasExtras, renda, nomeMeta, valorMeta, txt);
              }}
            />
          </View>

          {valorMetaNum > 0 && (
            <View style={[styles.boxResultadoMeta, { borderLeftColor: consegueAtingirMeta ? '#34C759' : '#FF9500' }]}>
              <Text style={styles.txtResultadoMeta}>
                Para atingir <Text style={{fontWeight: 'bold'}}>{nomeMeta || 'sua meta'}</Text> em {mesesMetaNum} meses:
              </Text>
              <Text style={styles.txtAporteMeta}>
                Guarde <Text style={{fontSize: 17, color: '#007AFF', fontWeight: 'bold'}}>R$ {aporteMensalNecessario.toFixed(2)}</Text> por mês.
              </Text>

              {rendaTotalGeral > 0 && (
                <Text style={[styles.txtStatusMeta, { color: consegueAtingirMeta ? '#2E7D32' : '#C75000' }]}>
                  {consegueAtingirMeta
                    ? '✅ Seu saldo livre atual cobre esta meta perfeitamente!'
                    : '⚠️ Seu saldo livre atual está abaixo do recomendado para esta meta.'}
                </Text>
              )}
            </View>
          )}
        </View>

        {ultrapassou && (
          <View style={styles.alertaVermelho}>
            <Text style={styles.textoAlerta}>
              ⚠️ ATENÇÃO: Os seus gastos ultrapassaram a sua renda total!
            </Text>
          </View>
        )}

        <View style={styles.linhaResumo}>
          <View style={[styles.miniCard, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.miniLabel}>Total Gastos</Text>
            <Text style={styles.miniValor}>R$ {totalGasto.toFixed(2)}</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: saldoRestante >= 0 ? '#34C759' : '#FF3B30' }]}>
            <Text style={styles.miniLabel}>Saldo Livre Total</Text>
            <Text style={styles.miniValor}>R$ {saldoRestante.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.botaoWhatsApp} onPress={compartilharWhatsApp}>
          <Text style={styles.textoBotaoWhatsApp}>💬 Partilhar Resumo no WhatsApp</Text>
        </TouchableOpacity>

        {rendaTotalGeral > 0 && (
          <View style={styles.cardInvestimento}>
            <Text style={styles.tituloInvestimento}>📈 Dica de Investimento</Text>
            {saldoRestante > 0 ? (
              <View>
                <Text style={styles.textoInvestimento}>
                  Com base no total recebido ({nomeMesSelecionado}):
                </Text>
                <View style
