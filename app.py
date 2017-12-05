#!/usr/bin/python
# -*- coding: utf-8 -*-
import csv
import os
import json
import locale
from flask import Flask
from flask import render_template, request, jsonify
import datetime as dt
import pandas as pd

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
df = pd.read_csv(os.path.join(BASE_DIR, 'static/dataset/common_data.csv'))

MONTHS = {
    "Січень": "Jan", "Лютий": "Feb", "Березень": "Mar", "Квітень": "Apr", "Травень": "May", "Червень": "Jun",
    "Липень": "Jul", "Серпень": "Aug", "Вересень": "Sep", "Жовтень": "Oct", "Листопад": "Nov", "Грудень": "Dec"
}
MONTHS_LIST = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
]
SHORT_MONTHS_LIST = [u"Січ", u"Лют", u"Бер", u"Кві", u"Тра", u"Чер", u"Лип", u"Сер", u"Вер", u"Жов", u"Лис", u"Гру"]


@app.route("/")
def main():
    years_df = df['year'].astype(int)
    years = list(years_df[years_df <= dt.date.today().year].drop_duplicates().values)
    months = [u'Січень', u'Лютий', u'Березень', u'Квітень', u'Травень', u'Червень', u'Липень',
              u'Серпень', u'Вересень', u'Жовтень', u'Листопад', u'Грудень']
    operators = map(lambda x: x.decode('utf-8'), list(df['operator'].drop_duplicates().values))
    operators.sort(cmp=locale.strcoll)
    directions = map(lambda x: x.decode('utf-8'), list(df['direction'].drop_duplicates().values))
    ports = map(lambda x: x.decode('utf-8'), list(df['port'].drop_duplicates().values))
    locale.setlocale(locale.LC_ALL, "")
    ports.sort(cmp=locale.strcoll)
    berts = map(lambda x: x.decode('utf-8'), list(df[df['port'] == ports[0].encode('utf-8')]['bert'].drop_duplicates().values))
    berts = sorted([int(i) if i.isdigit() else i for i in berts])
    return render_template('index.html',
                           years=years, months=months, operators=operators, directions=directions,
                           ports=ports, berts=berts,
                           default_filter_text_1=u'За весь період', default_filter_text_2=u'Усі',
                           default_port=ports[0])


@app.route("/accident", methods=['GET'])
def accident():
    return render_template('index2.html')


@app.route('/sankey_filter', methods=['GET'])
def sankey_filter():
    year = request.args.get('year')
    month = request.args.get('month')
    operator = request.args.get('operator')
    direction = request.args.get('direction')
    filter_params = {}
    if year != u'За весь період':
        filter_params['year'] = year
    if month != u'За весь період':
        filter_params['month'] = month
    if operator != u'Усі':
        filter_params['operator'] = operator
    if direction != u'Усі':
        filter_params['direction'] = direction
    data = sankey_aggregate(filter_params)
    return jsonify(links=data['links'], nodes=data['nodes'], popup=u'Сумарний обсяг переробленного вантажу: ')


@app.route('/stacked_bar_filter', methods=['GET'])
def stacked_bar_filter():
    port = request.args.get('port')
    direction = request.args.get('direction')
    bert = request.args.get('bert')
    filter_params = {}
    if direction != u'Усі':
        filter_params['direction'] = direction
    if bert != u'Усі':
        filter_params['bert'] = bert
    data, all_shipment = stacked_bar_aggregate(filter_params, port)
    return jsonify(data=data, all_shipment=all_shipment, shortMonths=SHORT_MONTHS_LIST, title=u'Обсяг переробленого вантажу')


@app.route('/map_filter', methods=['GET'])
def map_filter():
    filter_params = {}
    with open(os.path.join(BASE_DIR, 'static/dataset/ukraine.json')) as a_file:
        map_data = json.load(a_file)
        pie_data, one_port_pie_data = pie_aggregate(filter_params)
        ports_geo_data = []
        with open(os.path.join(BASE_DIR, 'static/dataset/ports_geo.csv')) as port_geo_file:
            reader = csv.DictReader(port_geo_file)
            for row in reader:
                record = dict()
                for key in ('amount', 'port', 'lat', 'lon'):
                    record[key] = row[key]
                ports_geo_data.append(record)
        return jsonify(
            map_data=map_data,
            pie_data=pie_data,
            ports_geo_data=ports_geo_data,
            one_port_pie_data=one_port_pie_data
        )


@app.route('/update_berts_list', methods=['GET'])
def update_berts_list():
    port = request.args.get('port')
    berts = map(lambda x: x.decode('utf-8'), list(df[df['port'] == port.encode('utf-8')]['bert'].drop_duplicates().values))
    berts = sorted([int(i) if i.isdigit() else i for i in berts])
    return jsonify(berts=berts)


def sankey_aggregate(filter_params):
    n = 20 # ports amount
    m = 30 # shipment amount
    df2 = df.copy()
    for key, val in filter_params.iteritems():
        if key == 'year':
            df2 = df2[df[key] == int(val)]
        else:
            df2 = df2[df[key] == val.encode('utf-8')]
    top_ports = df2.groupby(['port'])['value'].sum().index[:n]
    top_shipments = df2.groupby(['shipment'])['value'].sum().index[:m]
    grouped = df2.groupby(['port', 'shipment'])['value'].sum()
    # Generate links
    links = []
    ports = []
    shipments = []
    for i0 in grouped.index.levels[0]:
        if i0 in top_ports:
            is_relationship = False
            for i1 in grouped.loc[i0].index:
                if i1 in top_shipments:
                    is_relationship = True
                    links.append({ "port": i0.decode('utf-8'), "shipment": i1.decode('utf-8'), "value": float(grouped.loc[i0, i1]) })
                    if i1.decode('utf-8') not in shipments:
                        shipments.append(i1.decode('utf-8'))
            if is_relationship:
                ports.append(i0.decode('utf-8'))
    # Generate nodes
    all_nodes = ports + shipments
    nodes = [{'node': index, 'name': name} for (index, name) in enumerate(all_nodes)]
    # add target and source params to the links
    n = len(ports)
    for link in links:
        for node in ports:
            if node == link['port']:
                # port = source
                link['source'] = ports.index(node)
        for node in shipments:
            if node == link['shipment']:
                # shipments = target
                link['target'] = shipments.index(node) + n
    nodes = nodes if nodes != [] else 0
    links = links if links != [] else 0
    return {"nodes": nodes, "links": links}


def stacked_bar_aggregate(filter_params, port):
    df2 = df.copy()
    min_year, max_year = df2['year'].min(), df2['year'].max()
    min_month_index = df2[df2['year'] == min_year]['month'].apply(lambda x: MONTHS_LIST.index(x)).min() + 1
    max_month_index = df2[df2['year'] == max_year]['month'].apply(lambda x: MONTHS_LIST.index(x)).max() + 1
    for key, val in filter_params.iteritems():
        df2 = df2[df[key] == val.encode('utf-8')]
    grouped = df2[df2['port'] == port.encode('utf-8')].groupby(['year', 'month', 'shipment'])['value'].sum()
    res = []
    for y in range(min_year, max_year+1):
        if y == min_year:
            for m in range(min_month_index, 13):
                res.append({"date": "{}/{}".format(m,y), "values": []})
        elif y == max_year:
            for m in range(1,max_month_index+1):
                res.append({"date": "{}/{}".format(m,y), "values": []})
        else:
            for m in range(1,13):
                res.append({"date": "{}/{}".format(m,y), "values": []})
    not_null = False
    for i0 in grouped.index.levels[0]:
        try:
            for i1 in grouped.loc[i0].index.levels[0]:
                date = "{}/{}".format(MONTHS_LIST.index(i1)+1,i0)
                for k in res:
                    if k["date"] == date:
                        k["values"] = [{"name": i2.decode('utf-8'), "value": round(float(grouped.loc[i0, i1, i2]), 3)} for i2 in grouped.loc[i0, i1].index]
                        not_null = True
        except:
            continue
    if not not_null:
        res = 0
    return res, map(lambda x: x.decode('utf-8'), grouped.index.levels[2])


def pie_aggregate(filter_params):
    df2 = df.copy()
    for key, val in filter_params.iteritems():
        df2 = df2[df[key] == val.encode('utf-8')]
    grouped_port = df2.groupby(['port', 'shipment'])['value'].sum()
    grouped = df2.groupby(['shipment'])['value'].sum()
    res = []
    ports = dict()
    for i in grouped.index:
        res.append({"shipment": i.decode('utf-8'), "value": float(grouped.loc[i]) })
    for i in grouped_port.index:
        if i[0].decode('utf-8') in ports:
            ports[i[0].decode('utf-8')]["products"].append(
                {
                    "shipment": i[1],
                    "value": grouped_port[i]
                }
            )
        else:
            ports.update(
                {
                    i[0].decode('utf-8'):
                        {
                            "label": i[0].decode('utf-8'),
                            "products": [
                                {
                                    "shipment": i[1].decode('utf-8'),
                                    "value": grouped_port[i]
                                }
                            ]
                        }
                }
            )
    res_port = []
    # Transform from dictionary to list and add field "total" shipments for one port
    for k,v in ports.items():
        total = 0
        for t in v['products']:
            total += t["value"]
        v.update({"total": total})
        res_port.append(v)
    return res, res_port


if __name__ == "__main__":
    app.run(debug=True)