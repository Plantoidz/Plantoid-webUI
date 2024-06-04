import { Divider, Image } from "antd";

export default function About() {
  return (
    <div style={{ border: "1px solid #cccccc", padding: 16, width: 800, margin: "auto", marginTop: 64 }}>
      <h2>Plantoid #15</h2>
      <Divider />

      <table valign="top">
        <td>
          <Image
            style={{ border: "1px solid ", marginLeft: "-50px" }}
            width={350}
            height={520}
            src="https://ipfs.io/ipfs/QmRcrcn4X6QfSwFnJQ1dNHn8YgW7pbmm6BjZn7t8FW7WFV"
          />
        </td>

        <td>
          <span class="plantoid-text-cursive">
            Plantoids are the plant equivalent of an android; a robot or a synthetic organism designed to look, act and
            grow like a plant.
            <br />
            <br /> Plantoids are blockchain-based life-forms that live off crypto-currency. They are:
            <br /> <br />
            <ul>
              <li>
                <b>autonomous</b>, i.e. not controlled by anyone,
              </li>
              <li>
                <b>self-sufficient</b> as they survive on their own, and{" "}
              </li>
              <li>
                <b>capable of reproducing themselves</b>.
              </li>
            </ul>
            <br />
            Yet, like most plants, Plantoids cannot reproduce themselves on their own. They rely on capitalisation (as
            opposed to pollinisation) to reproduce.
            <br />
            <br />
            Specifically, Plantoids collect crypto-currency and then use the collected funds to hire new artists,
            commissioned to create new replicas of themselves via an evolutionary algorithm.
            <br />
          </span>
          <br />
          <Divider></Divider>
          <span class="plantoid-text-cursive">
            Plantoids is an art project initiated in 2014 by Primavera De Filippi, artist, activist and legal scholar,
            working on the field of cryptocurrency and blockchain technology.
            <br />
            <br />
            The goal of the Plantoid project is to illustrate one of the most revolutionary—and yet still
            unexplored—aspects of blockchain technology: the ability to create autonomous entities that can both own
            (crypto-)property and enter into (smart-)contractual relationships, without the need to rely on any
            third-party (legal) entity.{" "}
          </span>
          <Divider></Divider>
          <span class="plantoid-text-cursive">
            More information at <a href="https://plantoid.org">www.plantoid.org</a>
          </span>
        </td>
      </table>

      <br />
      <span class="plantoid-text-cursive">
        Plantoid #15 was born out of the contribution of many friends and colleagues, which I am deeply appreciative of.
        <br />
        These include, in particular:
        <br />
        <br />
        <ul>
          <li>Yannick LeDaniel — body art and design</li>
          <li>Martin Vert — electronics wiz</li>
          <li>Isaac Patka — smart contract architecture</li>
          <li>Ben Moskowitz - Artificial Intelligence</li>
          <li>Tony Lai - for donating the voice</li>
          <Divider></Divider>
          <li>All members of Feytopia and the GLITCH community who made me believe that everything is possible</li>
        </ul>
      </span>
    </div>
  );
}
